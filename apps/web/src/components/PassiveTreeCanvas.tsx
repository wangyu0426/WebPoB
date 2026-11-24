import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  Crosshair,
  Flame,
  Loader2,
  Maximize2,
  RotateCcw,
  Search,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { NodePowerDelta, PassiveNode } from '@webpob/core';
import {
  findShortestPathToNode,
  getAscendancyStartNodeId,
  getTreeForGame,
  getUniquesForGame,
  instantiateUniqueItem,
} from '@webpob/data';
import { localizeStatLine, localizeText, t } from '@webpob/i18n';
import { computeNodePower } from '@webpob/calc';
import { useWebPobStore } from '../store/useWebPobStore';
import { computeHeatmapInWorker } from '../workers/calcWorkerClient';
import type { NodePowerHeatItem } from '../workers/calc.worker';

const SPATIAL_CELL_SIZE = 320;

function getNodeRadius(kind: PassiveNode['kind'], isFullOfficial: boolean): number {
  const scale = isFullOfficial ? 2.4 : 1;
  switch (kind) {
    case 'start':
      return 34 * scale;
    case 'keystone':
      return 30 * scale;
    case 'mastery':
      return 24 * scale;
    case 'jewel':
      return 22 * scale;
    case 'notable':
      return 21 * scale;
    default:
      return 13 * scale;
  }
}

interface EdgeRecord {
  a: PassiveNode;
  b: PassiveNode;
  sameOrbitArc: boolean;
  cx?: number;
  cy?: number;
  r?: number;
  startAngle?: number;
  endAngle?: number;
  counterclockwise?: boolean;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function PassiveTreeCanvas() {
  const {
    locale,
    build,
    calc,
    dataLoading,
    treeRevision,
    treePaintMode,
    setTreePaintMode,
    togglePassiveNode,
    setMasteryEffect,
    socketJewel,
    resetPassiveTree,
  } = useWebPobStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 0.08 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIdx, setSearchIdx] = useState(0);
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [masteryModalNodeId, setMasteryModalNodeId] = useState<number | null>(null);
  const [jewelModalNodeId, setJewelModalNodeId] = useState<number | null>(null);
  const [jewelSearch, setJewelSearch] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapMap, setHeatmapMap] = useState<Map<number, NodePowerHeatItem>>(new Map());
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    camX: number;
    camY: number;
  }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    camX: 0,
    camY: 0,
  });

  // Re-evaluate whenever game switches or official full JSON finishes loading
  const tree = useMemo(() => {
    void treeRevision;
    return getTreeForGame(build.game);
  }, [build.game, treeRevision]);

  const isOfficialFull = Boolean(tree.isOfficialFull);

  // Filter visible nodes: main passive tree + selected Ascendancy sub-tree
  const visibleNodes = useMemo(() => {
    const ascTarget = build.ascendancyId?.toLowerCase().trim() || '';
    return Object.values(tree.nodes).filter(
      (n) => !n.ascendancyId || (ascTarget && n.ascendancyId.toLowerCase() === ascTarget),
    );
  }, [tree, build.ascendancyId]);

  const ascStartNodeId = useMemo(
    () => getAscendancyStartNodeId(tree, build.ascendancyId),
    [tree, build.ascendancyId],
  );

  const ascendancyCenter = useMemo(() => {
    const ascTarget = build.ascendancyId?.toLowerCase().trim() || '';
    if (!ascTarget) return null;
    const ascNodes = visibleNodes.filter(
      (n) => n.ascendancyId && n.ascendancyId.toLowerCase() === ascTarget,
    );
    if (ascNodes.length === 0) return null;
    let sumX = 0;
    let sumY = 0;
    for (const n of ascNodes) {
      sumX += n.x;
      sumY += n.y;
    }
    const cx = sumX / ascNodes.length;
    const cy = sumY / ascNodes.length;
    let maxDist = 300;
    for (const n of ascNodes) {
      const d = Math.hypot(n.x - cx, n.y - cy);
      if (d > maxDist) maxDist = d;
    }
    return { x: cx, y: cy, radius: maxDist + 160, count: ascNodes.length };
  }, [visibleNodes, build.ascendancyId]);

  // Build spatial hash grid for O(1) hover & click hit-testing across 4,500+ nodes
  const spatialGrid = useMemo(() => {
    const grid = new Map<string, PassiveNode[]>();
    for (const node of visibleNodes) {
      const cx = Math.floor(node.x / SPATIAL_CELL_SIZE);
      const cy = Math.floor(node.y / SPATIAL_CELL_SIZE);
      const key = `${cx},${cy}`;
      let bucket = grid.get(key);
      if (!bucket) {
        bucket = [];
        grid.set(key, bucket);
      }
      bucket.push(node);
    }
    return grid;
  }, [visibleNodes]);

  // Precompute deduplicated edge list with orbit arc geometry & AABB for viewport culling
  const edgeList = useMemo(() => {
    const visibleSet = new Set(visibleNodes.map((n) => n.id));
    const seen = new Set<string>();
    const edges: EdgeRecord[] = [];
    const groups = tree.groups ?? {};

    for (const a of visibleNodes) {
      for (const bId of a.adjacent) {
        if (!visibleSet.has(bId)) continue;
        const key = a.id < bId ? `${a.id}-${bId}` : `${bId}-${a.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const b = tree.nodes[bId];
        if (!b) continue;

        let sameOrbitArc = false;
        let cx: number | undefined;
        let cy: number | undefined;
        let r: number | undefined;
        let startAngle: number | undefined;
        let endAngle: number | undefined;
        let counterclockwise = false;

        if (
          a.group !== undefined &&
          a.group === b.group &&
          a.orbit !== undefined &&
          a.orbit > 0 &&
          a.orbit === b.orbit &&
          a.orbitRadius &&
          groups[a.group]
        ) {
          const g = groups[a.group]!;
          cx = g.x;
          cy = g.y;
          r = a.orbitRadius;
          const angA = Math.atan2(a.y - cy, a.x - cx);
          const angB = Math.atan2(b.y - cy, b.x - cx);
          let diff = angB - angA;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          // Draw curved arc only if span is <= 180 deg
          if (Math.abs(diff) < Math.PI - 0.05) {
            sameOrbitArc = true;
            startAngle = angA;
            endAngle = angB;
            counterclockwise = diff < 0;
          }
        }

        const pad = r ? r : 0;
        edges.push({
          a,
          b,
          sameOrbitArc,
          cx,
          cy,
          r,
          startAngle,
          endAngle,
          counterclockwise,
          minX: sameOrbitArc && cx !== undefined ? cx - pad : Math.min(a.x, b.x),
          maxX: sameOrbitArc && cx !== undefined ? cx + pad : Math.max(a.x, b.x),
          minY: sameOrbitArc && cy !== undefined ? cy - pad : Math.min(a.y, b.y),
          maxY: sameOrbitArc && cy !== undefined ? cy + pad : Math.max(a.y, b.y),
        });
      }
    }
    return edges;
  }, [visibleNodes, tree]);

  const sharedSet = useMemo(() => new Set(build.tree.allocatedNodeIds), [build.tree.allocatedNodeIds]);
  const set1Set = useMemo(() => new Set(build.tree.weaponSet1NodeIds), [build.tree.weaponSet1NodeIds]);
  const set2Set = useMemo(() => new Set(build.tree.weaponSet2NodeIds), [build.tree.weaponSet2NodeIds]);

  const centerOnBuild = useCallback(() => {
    const startId = tree.classStartNodeIds[build.classId];
    const focusIds =
      build.tree.allocatedNodeIds.length > 1
        ? build.tree.allocatedNodeIds
        : startId
          ? [startId]
          : [];

    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (const id of focusIds) {
      const n = tree.nodes[id];
      if (n && !n.ascendancyId) {
        sumX += n.x;
        sumY += n.y;
        count++;
      }
    }

    const defaultZoom = isOfficialFull ? (build.game === 'poe2' ? 0.095 : 0.13) : 0.62;
    if (count > 0) {
      const cx = sumX / count;
      const cy = sumY / count;
      setCamera({ x: -cx * defaultZoom, y: -cy * defaultZoom, zoom: defaultZoom });
    } else {
      setCamera({ x: 0, y: 0, zoom: defaultZoom });
    }
  }, [tree, build.classId, build.tree.allocatedNodeIds, build.game, isOfficialFull]);

  const fitWholeTree = useCallback(() => {
    const container = containerRef.current;
    const w = container?.clientWidth ?? 1000;
    const h = container?.clientHeight ?? 700;
    if (tree.bounds) {
      const spanX = Math.max(1000, tree.bounds.maxX - tree.bounds.minX);
      const spanY = Math.max(1000, tree.bounds.maxY - tree.bounds.minY);
      const zoom = Math.min(w / spanX, h / spanY) * 0.9;
      const midX = (tree.bounds.minX + tree.bounds.maxX) / 2;
      const midY = (tree.bounds.minY + tree.bounds.maxY) / 2;
      setCamera({ x: -midX * zoom, y: -midY * zoom, zoom });
    } else {
      setCamera({ x: 0, y: 0, zoom: 0.6 });
    }
  }, [tree]);

  const focusAscendancy = useCallback(() => {
    if (!ascendancyCenter) return;
    const targetZoom = isOfficialFull ? 0.2 : 0.9;
    setCamera({
      x: -ascendancyCenter.x * targetZoom,
      y: -ascendancyCenter.y * targetZoom,
      zoom: targetZoom,
    });
  }, [ascendancyCenter, isOfficialFull]);

  // Auto-center whenever game or official tree loads
  useEffect(() => {
    centerOnBuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [build.game, treeRevision]);

  // Background Web Worker batch Node Power Heatmap when enabled
  useEffect(() => {
    if (!heatmapEnabled) {
      setHeatmapMap(new Map());
      setHeatmapLoading(false);
      return;
    }
    let cancelled = false;
    setHeatmapLoading(true);

    // Pick unallocated Notable & Keystone nodes closest to currently allocated nodes (cap 300)
    const allocCoords: Array<{ x: number; y: number }> = [];
    for (const id of build.tree.allocatedNodeIds) {
      const n = tree.nodes[id];
      if (n) allocCoords.push({ x: n.x, y: n.y });
    }
    const candidates = visibleNodes
      .filter((n) => (n.kind === 'notable' || n.kind === 'keystone') && !sharedSet.has(n.id))
      .map((n) => {
        let minDist = Infinity;
        for (const c of allocCoords) {
          const d = Math.hypot(n.x - c.x, n.y - c.y);
          if (d < minDist) minDist = d;
        }
        return { id: n.id, dist: minDist };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 300)
      .map((c) => c.id);

    computeHeatmapInWorker(build, candidates)
      .then(({ items }) => {
        if (cancelled) return;
        const next = new Map<number, NodePowerHeatItem>();
        for (const it of items) next.set(it.nodeId, it);
        setHeatmapMap(next);
        setHeatmapLoading(false);
      })
      .catch(() => {
        if (!cancelled) setHeatmapLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [heatmapEnabled, build, tree, visibleNodes, sharedSet]);

  const matchedSearchList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const matches: PassiveNode[] = [];
    for (const node of visibleNodes) {
      const hay = [
        node.name.en,
        node.name.zh,
        ...node.stats,
        ...(node.statsZh ?? []),
      ]
        .join(' ')
        .toLowerCase();
      if (hay.includes(q)) {
        matches.push(node);
      }
    }
    return matches;
  }, [visibleNodes, searchQuery]);

  const matchedSearchIds = useMemo(
    () => new Set(matchedSearchList.map((n) => n.id)),
    [matchedSearchList],
  );

  const jumpToSearchMatch = (nextIndex: number) => {
    if (matchedSearchList.length === 0) return;
    const idx = ((nextIndex % matchedSearchList.length) + matchedSearchList.length) % matchedSearchList.length;
    setSearchIdx(idx);
    const target = matchedSearchList[idx]!;
    const targetZoom = isOfficialFull ? 0.22 : 1.0;
    setCamera({ x: -target.x * targetZoom, y: -target.y * targetZoom, zoom: targetZoom });
  };

  // Preview shortest path for hovered unallocated node
  const previewPathSet = useMemo(() => {
    if (hoveredNodeId === null) return new Set<number>();
    const hovered = tree.nodes[hoveredNodeId];
    if (!hovered || hovered.kind === 'mastery') return new Set<number>();
    const baseAllocated =
      build.game === 'poe2' && treePaintMode === 'set1'
        ? new Set([...sharedSet, ...set1Set])
        : build.game === 'poe2' && treePaintMode === 'set2'
          ? new Set([...sharedSet, ...set2Set])
          : new Set(sharedSet);
    if (hovered.ascendancyId && ascStartNodeId) {
      baseAllocated.add(ascStartNodeId);
    }
    if (baseAllocated.has(hoveredNodeId)) return new Set<number>();
    return new Set(findShortestPathToNode(tree, baseAllocated, hoveredNodeId));
  }, [hoveredNodeId, build.game, treePaintMode, sharedSet, set1Set, set2Set, ascStartNodeId, tree]);

  // Live Node Power Delta calculation on hover
  const hoveredPower: NodePowerDelta | null = useMemo(() => {
    if (hoveredNodeId === null) return null;
    const node = tree.nodes[hoveredNodeId];
    if (!node || node.kind === 'start' || node.kind === 'mastery') return null;
    return computeNodePower(build, hoveredNodeId, calc);
  }, [hoveredNodeId, tree, build, calc]);

  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      return {
        x: (sx - cx - camera.x) / camera.zoom,
        y: (sy - cy - camera.y) / camera.zoom,
      };
    },
    [camera],
  );

  // High-FPS Viewport-Culled Canvas Render
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Deep obsidian radial backdrop
    const grad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      30,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.78,
    );
    grad.addColorStop(0, '#131826');
    grad.addColorStop(1, '#080a0f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.translate(width / 2 + camera.x, height / 2 + camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Compute visible world viewport bounds for frustum culling
    const padWorld = 300 / Math.max(0.02, camera.zoom);
    const viewMinX = (-width / 2 - camera.x) / camera.zoom - padWorld;
    const viewMaxX = (width / 2 - camera.x) / camera.zoom + padWorld;
    const viewMinY = (-height / 2 - camera.y) / camera.zoom - padWorld;
    const viewMaxY = (height / 2 - camera.y) / camera.zoom + padWorld;

    const invZoom = 1 / camera.zoom;
    const baseLineWidth = Math.max(isOfficialFull ? 10 : 2, 1.5 * invZoom);
    const activeLineWidth = Math.max(isOfficialFull ? 18 : 4, 3.2 * invZoom);

    // 0. Draw golden Ascendancy medallion backdrop when selected Ascendancy sub-tree is in view
    if (ascendancyCenter) {
      ctx.save();
      const grad = ctx.createRadialGradient(
        ascendancyCenter.x,
        ascendancyCenter.y,
        ascendancyCenter.radius * 0.15,
        ascendancyCenter.x,
        ascendancyCenter.y,
        ascendancyCenter.radius,
      );
      grad.addColorStop(0, 'rgba(217, 155, 45, 0.14)');
      grad.addColorStop(0.75, 'rgba(180, 120, 30, 0.06)');
      grad.addColorStop(1, 'rgba(180, 120, 30, 0)');
      ctx.beginPath();
      ctx.arc(ascendancyCenter.x, ascendancyCenter.y, ascendancyCenter.radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(243, 204, 130, 0.28)';
      ctx.lineWidth = Math.max(isOfficialFull ? 12 : 2, 1.6 * invZoom);
      ctx.stroke();
      ctx.restore();
    }

    // 1. Draw visible edges (inactive first, active/highlighted second for crisp layering)
    const activeEdges: Array<{ edge: EdgeRecord; color: string; dashed: boolean }> = [];

    ctx.beginPath();
    ctx.strokeStyle = '#252c40';
    ctx.lineWidth = baseLineWidth;

    for (const edge of edgeList) {
      if (
        edge.maxX < viewMinX ||
        edge.minX > viewMaxX ||
        edge.maxY < viewMinY ||
        edge.minY > viewMaxY
      ) {
        continue;
      }

      const aId = edge.a.id;
      const bId = edge.b.id;
      const bothShared = sharedSet.has(aId) && sharedSet.has(bId);
      const isSet1Edge =
        build.game === 'poe2' &&
        (set1Set.has(aId) || set1Set.has(bId)) &&
        (sharedSet.has(aId) || set1Set.has(aId)) &&
        (sharedSet.has(bId) || set1Set.has(bId));
      const isSet2Edge =
        build.game === 'poe2' &&
        (set2Set.has(aId) || set2Set.has(bId)) &&
        (sharedSet.has(aId) || set2Set.has(aId)) &&
        (sharedSet.has(bId) || set2Set.has(bId));
      const isPreviewEdge =
        (previewPathSet.has(aId) || previewPathSet.has(bId)) &&
        (previewPathSet.has(aId) || sharedSet.has(aId) || set1Set.has(aId) || set2Set.has(aId)) &&
        (previewPathSet.has(bId) || sharedSet.has(bId) || set1Set.has(bId) || set2Set.has(bId));

      if (bothShared) {
        activeEdges.push({ edge, color: '#e8bc72', dashed: false });
        continue;
      }
      if (isSet1Edge) {
        activeEdges.push({ edge, color: '#22d3ee', dashed: false });
        continue;
      }
      if (isSet2Edge) {
        activeEdges.push({ edge, color: '#e879f9', dashed: false });
        continue;
      }
      if (isPreviewEdge) {
        activeEdges.push({ edge, color: '#fbbf24', dashed: true });
        continue;
      }

      if (edge.sameOrbitArc && edge.cx !== undefined && edge.cy !== undefined && edge.r !== undefined) {
        ctx.moveTo(edge.a.x, edge.a.y);
        ctx.arc(edge.cx, edge.cy, edge.r, edge.startAngle!, edge.endAngle!, edge.counterclockwise);
      } else {
        ctx.moveTo(edge.a.x, edge.a.y);
        ctx.lineTo(edge.b.x, edge.b.y);
      }
    }
    ctx.stroke();

    // Draw highlighted / allocated edges on top
    for (const { edge, color, dashed } of activeEdges) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = activeLineWidth;
      ctx.setLineDash(dashed ? [14 * invZoom * 0.5, 10 * invZoom * 0.5] : []);
      if (edge.sameOrbitArc && edge.cx !== undefined && edge.cy !== undefined && edge.r !== undefined) {
        ctx.arc(edge.cx, edge.cy, edge.r, edge.startAngle!, edge.endAngle!, edge.counterclockwise);
      } else {
        ctx.moveTo(edge.a.x, edge.a.y);
        ctx.lineTo(edge.b.x, edge.b.y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 2. Draw visible nodes with LOD
    const showKeystoneLabels = isOfficialFull ? camera.zoom >= 0.055 : true;
    const showNotableLabels = isOfficialFull ? camera.zoom >= 0.14 : true;
    const showSmallLabels = isOfficialFull ? camera.zoom >= 0.34 : camera.zoom >= 0.95;

    for (const node of visibleNodes) {
      if (
        node.x < viewMinX ||
        node.x > viewMaxX ||
        node.y < viewMinY ||
        node.y > viewMaxY
      ) {
        continue;
      }

      const r = getNodeRadius(node.kind, isOfficialFull);
      const isShared = sharedSet.has(node.id);
      const isSet1 = build.game === 'poe2' && set1Set.has(node.id);
      const isSet2 = build.game === 'poe2' && set2Set.has(node.id);
      const isMasteryChosen = node.kind === 'mastery' && Boolean(build.tree.masteryEffects[node.id]);
      const isPreview = previewPathSet.has(node.id);
      const isHovered = hoveredNodeId === node.id;
      const isSearchHit = matchedSearchIds.has(node.id);

      // Search glow ring
      if (isSearchHit) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 14 * (isOfficialFull ? 2 : 0.7), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
        ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = Math.max(4, 2.2 * invZoom);
        ctx.stroke();
      } else if (heatmapEnabled) {
        const heat = heatmapMap.get(node.id);
        if (heat) {
          const dpsIntensity = Math.min(1, heat.dpsDeltaPct / 12);
          const ehpIntensity = Math.min(1, heat.ehpDeltaPct / 12);
          const isDpsDominant = heat.dpsDeltaPct >= heat.ehpDeltaPct;
          const alpha = Math.max(0.22, Math.max(dpsIntensity, ehpIntensity) * 0.72);
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 18 * (isOfficialFull ? 2.2 : 0.8), 0, Math.PI * 2);
          ctx.fillStyle = isDpsDominant
            ? `rgba(249, 115, 22, ${alpha * 0.45})`
            : `rgba(56, 189, 248, ${alpha * 0.45})`;
          ctx.fill();
          ctx.strokeStyle = isDpsDominant
            ? `rgba(251, 146, 60, ${alpha})`
            : `rgba(56, 189, 248, ${alpha})`;
          ctx.lineWidth = Math.max(5, 2.5 * invZoom);
          ctx.stroke();
        }
      }

      // Node shape
      ctx.beginPath();
      if (node.kind === 'jewel') {
        // Hexagonal jewel socket
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI / 3) * i - Math.PI / 6;
          const px = node.x + r * Math.cos(ang);
          const py = node.y + r * Math.sin(ang);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      }

      if (isShared || isMasteryChosen) {
        ctx.fillStyle =
          node.kind === 'keystone'
            ? '#7c2d12'
            : node.kind === 'mastery'
              ? '#1e3a5f'
              : node.kind === 'notable'
                ? '#5c4119'
                : '#3e3018';
        ctx.strokeStyle = isMasteryChosen ? '#38bdf8' : '#f3cc82';
        ctx.lineWidth = Math.max(isOfficialFull ? 10 : 2.5, 2.2 * invZoom);
      } else if (isSet1) {
        ctx.fillStyle = '#0e3a4c';
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = Math.max(isOfficialFull ? 10 : 2.5, 2.2 * invZoom);
      } else if (isSet2) {
        ctx.fillStyle = '#4a124f';
        ctx.strokeStyle = '#e879f9';
        ctx.lineWidth = Math.max(isOfficialFull ? 10 : 2.5, 2.2 * invZoom);
      } else if (isPreview) {
        ctx.fillStyle = '#332812';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = Math.max(isOfficialFull ? 9 : 2.5, 2 * invZoom);
      } else {
        ctx.fillStyle =
          node.kind === 'keystone'
            ? '#22182b'
            : node.kind === 'mastery'
              ? '#12192b'
              : node.kind === 'jewel'
                ? '#0f2220'
                : node.kind === 'notable'
                  ? '#1a2033'
                  : '#111520';
        ctx.strokeStyle = isHovered
          ? '#f3cc82'
          : node.kind === 'keystone'
            ? '#a3773c'
            : node.kind === 'notable'
              ? '#5c6687'
              : node.kind === 'jewel'
                ? '#2f7a71'
                : node.kind === 'mastery'
                  ? '#385780'
                  : '#323a52';
        ctx.lineWidth = Math.max(isOfficialFull ? 6 : 1.8, (isHovered ? 2.5 : 1.4) * invZoom);
      }

      ctx.fill();
      ctx.stroke();

      // Inner emblem for Keystone / Notable / Mastery / Start
      if (node.kind === 'keystone') {
        const d = r * 0.45;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y - d);
        ctx.lineTo(node.x + d, node.y);
        ctx.lineTo(node.x, node.y + d);
        ctx.lineTo(node.x - d, node.y);
        ctx.closePath();
        ctx.fillStyle = isShared ? '#fbbf24' : '#9c7134';
        ctx.fill();
      } else if (node.kind === 'mastery') {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = isMasteryChosen ? '#38bdf8' : '#3a5d8a';
        ctx.fill();
      } else if (node.kind === 'jewel' && build.tree.socketedJewels?.[node.id]) {
        const d = r * 0.55;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y - d);
        ctx.lineTo(node.x + d, node.y);
        ctx.lineTo(node.x, node.y + d);
        ctx.lineTo(node.x - d, node.y);
        ctx.closePath();
        ctx.fillStyle = '#34d399';
        ctx.fill();
      } else if (node.kind === 'notable' || node.kind === 'start') {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = isShared ? '#f3cc82' : isSet1 ? '#22d3ee' : isSet2 ? '#e879f9' : '#4a5575';
        ctx.fill();
      }

      // LOD Text Labels
      const shouldLabel =
        isHovered ||
        isSearchHit ||
        node.kind === 'start' ||
        (node.kind === 'keystone' && showKeystoneLabels) ||
        (node.kind === 'notable' && showNotableLabels) ||
        (node.kind === 'small' && showSmallLabels);

      if (shouldLabel) {
        const fontPx = Math.round(
          (node.kind === 'keystone' || node.kind === 'start' ? 12.5 : 11) * invZoom,
        );
        ctx.font = `${node.kind === 'keystone' || node.kind === 'start' ? '700' : '600'} ${fontPx}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle =
          isShared || isSet1 || isSet2 || isHovered || isSearchHit ? '#fef3c7' : '#9ca7c2';
        ctx.fillText(localizeText(node.name, locale), node.x, node.y + r + 4 * invZoom);
      }
    }

    ctx.restore();
  }, [
    camera,
    visibleNodes,
    edgeList,
    sharedSet,
    set1Set,
    set2Set,
    previewPathSet,
    hoveredNodeId,
    matchedSearchIds,
    build.game,
    build.tree.masteryEffects,
    build.tree.socketedJewels,
    locale,
    isOfficialFull,
    ascendancyCenter,
    heatmapEnabled,
    heatmapMap,
  ]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setCamera((c) => ({ ...c }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // O(1) spatial hash hit-test
  const hitTestNode = (sx: number, sy: number): number | null => {
    const world = screenToWorld(sx, sy);
    const gx = Math.floor(world.x / SPATIAL_CELL_SIZE);
    const gy = Math.floor(world.y / SPATIAL_CELL_SIZE);

    let bestId: number | null = null;
    let bestDistSq = Infinity;
    const extraPad = 10 / Math.max(0.03, camera.zoom);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = spatialGrid.get(`${gx + dx},${gy + dy}`);
        if (!bucket) continue;
        for (const node of bucket) {
          const hitR = getNodeRadius(node.kind, isOfficialFull) + extraPad;
          const distX = world.x - node.x;
          const distY = world.y - node.y;
          const dSq = distX * distX + distY * distY;
          if (dSq <= hitR * hitR && dSq < bestDistSq) {
            bestDistSq = dSq;
            bestId = node.id;
          }
        }
      }
    }
    return bestId;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      camX: camera.x,
      camY: camera.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    setMousePos({ x: sx, y: sy });

    if (dragRef.current.active) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        dragRef.current.moved = true;
      }
      setCamera((c) => ({ ...c, x: dragRef.current.camX + dx, y: dragRef.current.camY + dy }));
      return;
    }

    setHoveredNodeId(hitTestNode(sx, sy));
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const wasDrag = dragRef.current.moved;
    dragRef.current.active = false;
    if (!wasDrag) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickedId = hitTestNode(e.clientX - rect.left, e.clientY - rect.top);
      if (clickedId !== null) {
        const clickedNode = tree.nodes[clickedId];
        if (clickedNode?.kind === 'mastery' && clickedNode.masteryEffects?.length) {
          setMasteryModalNodeId(clickedId);
        } else if (clickedNode?.kind === 'jewel' && sharedSet.has(clickedId)) {
          setJewelModalNodeId(clickedId);
          setJewelSearch('');
        } else {
          togglePassiveNode(clickedId);
        }
      }
    }
  };

  // Cursor-centered smooth zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left - rect.width / 2;
    const sy = e.clientY - rect.top - rect.height / 2;

    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    const minZoom = isOfficialFull ? 0.025 : 0.3;
    const maxZoom = isOfficialFull ? 0.75 : 2.2;

    setCamera((c) => {
      const nextZoom = Math.max(minZoom, Math.min(maxZoom, c.zoom * factor));
      const ratio = nextZoom / c.zoom;
      return {
        zoom: nextZoom,
        x: sx - (sx - c.x) * ratio,
        y: sy - (sy - c.y) * ratio,
      };
    });
  };

  const hoveredNode = hoveredNodeId !== null ? tree.nodes[hoveredNodeId] : null;
  const masteryModalNode = masteryModalNodeId !== null ? tree.nodes[masteryModalNodeId] : null;

  const getDisplayStats = (node: PassiveNode): string[] => {
    if (locale === 'zh-CN' && node.statsZh && node.statsZh.length === node.stats.length) {
      return node.statsZh;
    }
    return node.stats.map((s) => localizeStatLine(s, locale));
  };

  return (
    <div ref={containerRef} className="relative flex-1 w-full h-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          dragRef.current.active = false;
          setHoveredNodeId(null);
        }}
        onWheel={handleWheel}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* Top Overlay Controls */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Bilingual Search with Jump-to-Match */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchIdx(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') jumpToSearchMatch(searchIdx + 1);
              }}
              placeholder={t(locale, 'tree.searchPlaceholder')}
              className="pob-input rounded-md pl-8 pr-12 py-1.5 text-xs w-64 shadow-lg"
            />
            {searchQuery.trim() && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-amber-300 font-mono">
                {matchedSearchList.length}
              </span>
            )}
          </div>
          {matchedSearchList.length > 0 && (
            <button
              type="button"
              onClick={() => jumpToSearchMatch(searchIdx + 1)}
              className="flex items-center gap-0.5 px-2 py-1.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs hover:bg-amber-500/30 cursor-pointer"
              title="Jump to next match"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="rounded bg-[#111521]/90 border border-[#252c40] px-2 py-1 text-[10px] font-mono text-zinc-400">
            {dataLoading ? (
              <span className="inline-flex items-center gap-1 text-amber-300">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading official tree...
              </span>
            ) : (
              <span>
                v{tree.version} · {visibleNodes.length.toLocaleString()} nodes
              </span>
            )}
          </span>
        </div>

        {/* PoE 2 Weapon Set Passive Paint Mode */}
        {build.game === 'poe2' && (
          <div className="pointer-events-auto flex items-center gap-1 rounded-md bg-[#11141e]/95 border border-[#2a3147] p-1 shadow-lg text-xs">
            <span className="text-[11px] text-zinc-400 px-1.5">{t(locale, 'tree.paintMode')}:</span>
            <button
              type="button"
              onClick={() => setTreePaintMode('shared')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                treePaintMode === 'shared'
                  ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40'
                  : 'text-zinc-400'
              }`}
            >
              {t(locale, 'tree.paintShared')}
            </button>
            <button
              type="button"
              onClick={() => setTreePaintMode('set1')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                treePaintMode === 'set1'
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                  : 'text-zinc-400'
              }`}
            >
              {t(locale, 'tree.paintSet1')}
            </button>
            <button
              type="button"
              onClick={() => setTreePaintMode('set2')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                treePaintMode === 'set2'
                  ? 'bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-400/40'
                  : 'text-zinc-400'
              }`}
            >
              {t(locale, 'tree.paintSet2')}
            </button>
          </div>
        )}

        {/* Zoom & Framing Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              setCamera((c) => ({ ...c, zoom: Math.min(isOfficialFull ? 0.75 : 2.2, c.zoom * 1.25) }))
            }
            title={t(locale, 'tree.zoomIn')}
            className="p-1.5 rounded bg-[#141824]/90 border border-[#2a3147] text-zinc-300 hover:text-amber-200 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              setCamera((c) => ({ ...c, zoom: Math.max(isOfficialFull ? 0.025 : 0.3, c.zoom * 0.8) }))
            }
            title={t(locale, 'tree.zoomOut')}
            className="p-1.5 rounded bg-[#141824]/90 border border-[#2a3147] text-zinc-300 hover:text-amber-200 cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={centerOnBuild}
            title="Center on Build"
            className="flex items-center gap-1 px-2 py-1.5 rounded bg-[#141824]/90 border border-[#2a3147] text-xs text-zinc-300 hover:text-amber-200 cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5" />
            {locale === 'zh-CN' ? '定位BD' : 'Focus'}
          </button>
          {ascendancyCenter && (
            <button
              type="button"
              onClick={focusAscendancy}
              title={build.ascendancyId}
              className="flex items-center gap-1 px-2 py-1.5 rounded bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200 hover:bg-amber-500/25 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {locale === 'zh-CN' ? `升华 (${calc.ascendancyPoints ?? 0}/8)` : `Asc (${calc.ascendancyPoints ?? 0}/8)`}
            </button>
          )}
          <button
            type="button"
            onClick={() => setHeatmapEnabled((v) => !v)}
            title={
              locale === 'zh-CN'
                ? '后台 Web Worker 计算高收益大点热力图（橙=DPS / 蓝=EHP）'
                : 'Background Web Worker Node Power Heatmap (Orange=DPS / Blue=EHP)'
            }
            className={`flex items-center gap-1 px-2 py-1.5 rounded border text-xs cursor-pointer transition ${
              heatmapEnabled
                ? 'bg-orange-500/25 border-orange-400/60 text-orange-200'
                : 'bg-[#141824]/90 border-[#2a3147] text-zinc-300 hover:text-orange-200'
            }`}
          >
            {heatmapLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Flame className="w-3.5 h-3.5" />
            )}
            {locale === 'zh-CN' ? '热力图' : 'Power'}
          </button>
          <button
            type="button"
            onClick={fitWholeTree}
            title={t(locale, 'tree.resetView')}
            className="flex items-center gap-1 px-2 py-1.5 rounded bg-[#141824]/90 border border-[#2a3147] text-xs text-zinc-300 hover:text-amber-200 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            {locale === 'zh-CN' ? '全景' : 'Fit All'}
          </button>
          <button
            type="button"
            onClick={resetPassiveTree}
            className="flex items-center gap-1 px-2 py-1.5 rounded bg-[#141824]/90 border border-rose-500/30 text-xs text-rose-300 hover:bg-rose-950/40 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t(locale, 'tree.resetTree')}
          </button>
        </div>
      </div>

      {/* Bottom Hint Bar */}
      <div className="absolute bottom-3 left-3 pointer-events-none rounded bg-[#0d1018]/85 border border-[#252b3d] px-3 py-1 text-[11px] text-zinc-400">
        {t(locale, 'tree.hint')}
      </div>

      {/* Jewel Socket Picker Modal */}
      {jewelModalNodeId !== null && (
        <div className="absolute inset-0 z-40 bg-black/60 flex items-center justify-center p-4">
          <div className="pob-panel rounded-lg w-full max-w-lg p-4 space-y-3 shadow-2xl border-emerald-500/40">
            <div className="flex items-center justify-between border-b border-[#252b3d] pb-2">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                {locale === 'zh-CN'
                  ? `珠宝插槽 #${jewelModalNodeId}`
                  : `Jewel Socket #${jewelModalNodeId}`}
              </div>
              <button
                type="button"
                onClick={() => setJewelModalNodeId(null)}
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {build.tree.socketedJewels?.[jewelModalNodeId] &&
              build.items[build.tree.socketedJewels[jewelModalNodeId]!] && (
                <div className="rounded bg-emerald-950/25 border border-emerald-500/40 p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-200">
                      {build.items[build.tree.socketedJewels[jewelModalNodeId]!]!.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => socketJewel(jewelModalNodeId, null)}
                      className="text-[11px] text-rose-300 hover:text-rose-200 cursor-pointer"
                    >
                      {locale === 'zh-CN' ? '取下珠宝' : 'Unsocket'}
                    </button>
                  </div>
                  {build.items[build.tree.socketedJewels[jewelModalNodeId]!]!.explicits.map(
                    (l, i) => (
                      <div key={i} className="text-indigo-200/90">
                        • {localizeStatLine(l, locale)}
                      </div>
                    ),
                  )}
                </div>
              )}

            {/* Quick Rare Jewel Presets */}
            <div className="space-y-1">
              <div className="text-[11px] text-zinc-400 font-semibold">
                {locale === 'zh-CN' ? '快捷镶嵌稀有珠宝' : 'Quick Rare Jewels'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
                {[
                  {
                    name: 'Cobalt Spell Jewel',
                    nameZh: '钴蓝法术珠宝',
                    baseName: 'Cobalt Jewel',
                    explicits: ['7% increased maximum Life', '14% increased Spell Damage', '+15% to Global Critical Strike Multiplier'],
                  },
                  {
                    name: 'Crimson Melee Jewel',
                    nameZh: '赤红近战珠宝',
                    baseName: 'Crimson Jewel',
                    explicits: ['7% increased maximum Life', '14% increased Melee Physical Damage', '6% increased Attack Speed'],
                  },
                  {
                    name: 'Viridian Crit ES Jewel',
                    nameZh: '翠绿护盾暴击珠宝',
                    baseName: 'Viridian Jewel',
                    explicits: ['8% increased maximum Energy Shield', '14% increased Elemental Damage', '+15% to Global Critical Strike Multiplier'],
                  },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      socketJewel(jewelModalNodeId, {
                        id: `jewel_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                        name: preset.name,
                        nameZh: preset.nameZh,
                        baseName: preset.baseName,
                        rarity: 'RARE',
                        slotType: 'Any',
                        quality: 0,
                        implicits: [],
                        explicits: preset.explicits,
                      });
                      setJewelModalNodeId(null);
                    }}
                    className="rounded p-2 text-left bg-[#121623] hover:bg-[#1a2033] border border-yellow-500/30 text-yellow-200 cursor-pointer"
                  >
                    <div className="font-semibold text-[11px]">
                      {locale === 'zh-CN' ? preset.nameZh : preset.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Official Unique Jewels Search */}
            <div className="space-y-1.5">
              <input
                type="text"
                value={jewelSearch}
                onChange={(e) => setJewelSearch(e.target.value)}
                placeholder={locale === 'zh-CN' ? '搜索官方传奇珠宝 (如 守望之眼 / Watcher)...' : 'Search official Unique Jewels...'}
                className="pob-input w-full rounded px-2.5 py-1.5 text-xs"
              />
              <div className="max-h-44 overflow-y-auto space-y-1">
                {getUniquesForGame(build.game)
                  .filter((u) => {
                    if (u.s !== 'Jewel') return false;
                    const q = jewelSearch.trim().toLowerCase();
                    if (!q) return true;
                    return `${u.en} ${u.zh ?? ''} ${u.e.join(' ')}`.toLowerCase().includes(q);
                  })
                  .slice(0, 25)
                  .map((u) => (
                    <button
                      key={u.en}
                      type="button"
                      onClick={() => {
                        socketJewel(jewelModalNodeId, instantiateUniqueItem(build.game, u, 0));
                        setJewelModalNodeId(null);
                      }}
                      className="w-full text-left rounded px-2.5 py-1.5 bg-[#0e111b] hover:bg-[#171c2b] border border-orange-500/25 text-xs cursor-pointer"
                    >
                      <div className="font-semibold text-orange-300">
                        {locale === 'zh-CN' && u.zh ? `${u.zh} (${u.en})` : u.en}
                      </div>
                      {u.e.length > 0 && (
                        <div className="text-[10px] text-indigo-200/80 truncate">
                          {u.e.slice(0, 2).map((l) => localizeStatLine(l, locale)).join(' · ')}
                        </div>
                      )}
                    </button>
                  ))}
              </div>
            </div>

            <div className="flex justify-end pt-1 border-t border-[#252b3d]">
              <button
                type="button"
                onClick={() => {
                  const nid = jewelModalNodeId;
                  setJewelModalNodeId(null);
                  togglePassiveNode(nid);
                }}
                className="px-2.5 py-1 rounded text-xs text-rose-300 hover:bg-rose-950/40 border border-rose-500/35 cursor-pointer"
              >
                {locale === 'zh-CN' ? '取消点亮此插槽' : 'Unallocate Socket Node'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mastery Picker Modal (PoE 1) */}
      {masteryModalNode && masteryModalNode.masteryEffects && (
        <div className="absolute inset-0 z-40 bg-black/60 flex items-center justify-center p-4">
          <div className="pob-panel rounded-lg w-full max-w-lg p-4 space-y-3 shadow-2xl border-sky-500/40">
            <div className="flex items-center justify-between border-b border-[#252b3d] pb-2">
              <div className="flex items-center gap-2 text-sky-300 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                {localizeText(masteryModalNode.name, locale)}
              </div>
              <button
                type="button"
                onClick={() => setMasteryModalNodeId(null)}
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {masteryModalNode.masteryEffects.map((effect) => {
                const rawEn = effect.stats.join('\n');
                const isSelected = build.tree.masteryEffects[masteryModalNode.id] === rawEn;
                const display =
                  locale === 'zh-CN' && effect.statsZh ? effect.statsZh : effect.stats;
                return (
                  <button
                    key={effect.id}
                    type="button"
                    onClick={() => {
                      setMasteryEffect(masteryModalNode.id, isSelected ? null : rawEn);
                      setMasteryModalNodeId(null);
                    }}
                    className={`w-full text-left rounded p-2.5 text-xs border transition cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-400 text-sky-100'
                        : 'bg-[#0b0e15] border-[#23293a] text-zinc-200 hover:border-amber-500/40'
                    }`}
                  >
                    {display.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Rich Bilingual Hover Tooltip with Live Node Power Delta */}
      {hoveredNode && !masteryModalNode && (
        <div
          className="pointer-events-none absolute z-30 w-80 rounded-md border border-amber-500/45 bg-[#0e111a]/95 shadow-2xl p-3 text-xs backdrop-blur-sm"
          style={{
            left: Math.min(mousePos.x + 18, (containerRef.current?.clientWidth ?? 800) - 335),
            top: Math.min(mousePos.y + 18, (containerRef.current?.clientHeight ?? 600) - 240),
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#262d40] pb-1.5 mb-2">
            <div className="min-w-0">
              <div className="font-bold text-amber-200 text-sm truncate">
                {localizeText(hoveredNode.name, locale)}
              </div>
              {hoveredNode.name.zh !== hoveredNode.name.en && (
                <div className="text-[10px] text-zinc-400 truncate">
                  {locale === 'zh-CN' ? hoveredNode.name.en : hoveredNode.name.zh}
                </div>
              )}
            </div>
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
              {hoveredNode.kind}
            </span>
          </div>

          <div className="space-y-1 text-sky-200/95">
            {hoveredNode.kind === 'mastery' ? (
              <div className="text-sky-300">
                {build.tree.masteryEffects[hoveredNode.id]
                  ? localizeStatLine(build.tree.masteryEffects[hoveredNode.id]!, locale)
                  : locale === 'zh-CN'
                    ? '点击选择专精词缀效果'
                    : 'Click to choose a Mastery effect'}
              </div>
            ) : hoveredNode.kind === 'jewel' && build.tree.socketedJewels?.[hoveredNode.id] ? (
              (() => {
                const j = build.items[build.tree.socketedJewels![hoveredNode.id]!];
                if (!j) return <div className="text-zinc-400 italic">Jewel Socket</div>;
                return (
                  <div className="space-y-0.5">
                    <div className="text-emerald-300 font-semibold">
                      {locale === 'zh-CN' && j.nameZh ? j.nameZh : j.name}
                    </div>
                    {j.explicits.map((line, idx) => (
                      <div key={idx} className="text-indigo-200">
                        • {localizeStatLine(line, locale)}
                      </div>
                    ))}
                  </div>
                );
              })()
            ) : hoveredNode.stats.length === 0 ? (
              <div className="text-zinc-400 italic">{t(locale, 'tree.start')}</div>
            ) : (
              getDisplayStats(hoveredNode).map((stat, idx) => (
                <div key={idx}>• {stat}</div>
              ))
            )}
          </div>

          {hoveredPower && (
            <div className="mt-2.5 pt-2 border-t border-[#262d40] space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                {t(locale, 'tree.nodePower')}{' '}
                {previewPathSet.size > 1 && `(+${previewPathSet.size} pts)`}
              </div>
              <div className="grid grid-cols-2 gap-1 font-mono text-[11px]">
                <div className={hoveredPower.dpsDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  DPS: {hoveredPower.dpsDelta >= 0 ? '+' : ''}
                  {Math.round(hoveredPower.dpsDelta).toLocaleString()} (
                  {hoveredPower.dpsDeltaPct >= 0 ? '+' : ''}
                  {hoveredPower.dpsDeltaPct}%)
                </div>
                <div className={hoveredPower.lifeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  Life: {hoveredPower.lifeDelta >= 0 ? '+' : ''}
                  {hoveredPower.lifeDelta}
                </div>
                <div className={hoveredPower.esDelta >= 0 ? 'text-sky-300' : 'text-rose-400'}>
                  ES: {hoveredPower.esDelta >= 0 ? '+' : ''}
                  {hoveredPower.esDelta}
                </div>
                <div className={hoveredPower.ehpDelta >= 0 ? 'text-emerald-300' : 'text-rose-400'}>
                  EHP: {hoveredPower.ehpDelta >= 0 ? '+' : ''}
                  {Math.round(hoveredPower.ehpDelta).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
