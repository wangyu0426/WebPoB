import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, RotateCcw, Search, ZoomIn, ZoomOut } from 'lucide-react';
import type { NodePowerDelta, PassiveNode } from '@webpob/core';
import { findShortestPathToNode, getTreeForGame } from '@webpob/data';
import { localizeStatLine, localizeText, t } from '@webpob/i18n';
import { computeNodePower } from '@webpob/calc';
import { useWebPobStore } from '../store/useWebPobStore';

function getNodeRadius(kind: PassiveNode['kind']): number {
  switch (kind) {
    case 'start':
      return 24;
    case 'keystone':
      return 22;
    case 'notable':
      return 16;
    default:
      return 11;
  }
}

export function PassiveTreeCanvas() {
  const {
    locale,
    build,
    calc,
    treePaintMode,
    setTreePaintMode,
    togglePassiveNode,
    resetPassiveTree,
  } = useWebPobStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 0.62 });
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ active: boolean; moved: boolean; startX: number; startY: number; camX: number; camY: number }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    camX: 0,
    camY: 0,
  });

  const tree = useMemo(() => getTreeForGame(build.game), [build.game]);
  const nodeList = useMemo(() => Object.values(tree.nodes), [tree]);

  const sharedSet = useMemo(() => new Set(build.tree.allocatedNodeIds), [build.tree.allocatedNodeIds]);
  const set1Set = useMemo(() => new Set(build.tree.weaponSet1NodeIds), [build.tree.weaponSet1NodeIds]);
  const set2Set = useMemo(() => new Set(build.tree.weaponSet2NodeIds), [build.tree.weaponSet2NodeIds]);

  const matchedSearchIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return new Set<number>();
    const matches = new Set<number>();
    for (const node of nodeList) {
      const hay = [
        node.name.en,
        node.name.zh,
        ...node.stats,
        ...node.stats.map((s) => localizeStatLine(s, 'zh-CN')),
      ]
        .join(' ')
        .toLowerCase();
      if (hay.includes(q)) {
        matches.add(node.id);
      }
    }
    return matches;
  }, [nodeList, searchQuery]);

  // Preview shortest path for hovered unallocated node
  const previewPathSet = useMemo(() => {
    if (hoveredNodeId === null) return new Set<number>();
    const baseAllocated =
      build.game === 'poe2' && treePaintMode === 'set1'
        ? new Set([...sharedSet, ...set1Set])
        : build.game === 'poe2' && treePaintMode === 'set2'
          ? new Set([...sharedSet, ...set2Set])
          : sharedSet;
    if (baseAllocated.has(hoveredNodeId)) return new Set<number>();
    return new Set(findShortestPathToNode(tree, baseAllocated, hoveredNodeId));
  }, [hoveredNodeId, build.game, treePaintMode, sharedSet, set1Set, set2Set, tree]);

  // Live Node Power Delta calculation on hover
  const hoveredPower: NodePowerDelta | null = useMemo(() => {
    if (hoveredNodeId === null) return null;
    const node = tree.nodes[hoveredNodeId];
    if (!node || node.kind === 'start') return null;
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

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Background radial glow
    const grad = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, Math.max(width, height) * 0.75);
    grad.addColorStop(0, '#141824');
    grad.addColorStop(1, '#090b10');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.translate(width / 2 + camera.x, height / 2 + camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Subtle concentric orbit guide rings
    ctx.strokeStyle = 'rgba(200, 162, 101, 0.06)';
    ctx.lineWidth = 1.5;
    for (const r of [240, 330, 410, 495, 585, 660]) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw edges
    const drawnEdges = new Set<string>();
    for (const node of nodeList) {
      for (const adjId of node.adjacent) {
        const key = node.id < adjId ? `${node.id}-${adjId}` : `${adjId}-${node.id}`;
        if (drawnEdges.has(key)) continue;
        drawnEdges.add(key);

        const target = tree.nodes[adjId];
        if (!target) continue;

        const bothShared = sharedSet.has(node.id) && sharedSet.has(adjId);
        const isSet1Edge =
          build.game === 'poe2' &&
          (set1Set.has(node.id) || set1Set.has(adjId)) &&
          (sharedSet.has(node.id) || set1Set.has(node.id)) &&
          (sharedSet.has(adjId) || set1Set.has(adjId));
        const isSet2Edge =
          build.game === 'poe2' &&
          (set2Set.has(node.id) || set2Set.has(adjId)) &&
          (sharedSet.has(node.id) || set2Set.has(node.id)) &&
          (sharedSet.has(adjId) || set2Set.has(adjId));
        const isPreviewEdge =
          (previewPathSet.has(node.id) || previewPathSet.has(adjId)) &&
          (previewPathSet.has(node.id) || sharedSet.has(node.id) || set1Set.has(node.id) || set2Set.has(node.id)) &&
          (previewPathSet.has(adjId) || sharedSet.has(adjId) || set1Set.has(adjId) || set2Set.has(adjId));

        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(target.x, target.y);

        if (bothShared) {
          ctx.strokeStyle = '#e5b96e';
          ctx.lineWidth = 4;
          ctx.setLineDash([]);
        } else if (isSet1Edge) {
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 3.5;
          ctx.setLineDash([]);
        } else if (isSet2Edge) {
          ctx.strokeStyle = '#e879f9';
          ctx.lineWidth = 3.5;
          ctx.setLineDash([]);
        } else if (isPreviewEdge) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 6]);
        } else {
          ctx.strokeStyle = '#2b3247';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
        }
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    // Draw nodes
    for (const node of nodeList) {
      const r = getNodeRadius(node.kind);
      const isShared = sharedSet.has(node.id);
      const isSet1 = build.game === 'poe2' && set1Set.has(node.id);
      const isSet2 = build.game === 'poe2' && set2Set.has(node.id);
      const isPreview = previewPathSet.has(node.id);
      const isHovered = hoveredNodeId === node.id;
      const isSearchHit = matchedSearchIds.has(node.id);

      // Search pulse ring
      if (isSearchHit) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
        ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Outer node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);

      if (isShared) {
        ctx.fillStyle = node.kind === 'keystone' ? '#7c2d12' : node.kind === 'notable' ? '#5c4119' : '#3e3018';
        ctx.strokeStyle = '#f3cc82';
        ctx.lineWidth = node.kind === 'small' ? 2.5 : 3.5;
      } else if (isSet1) {
        ctx.fillStyle = '#0e3a4c';
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 3;
      } else if (isSet2) {
        ctx.fillStyle = '#4a124f';
        ctx.strokeStyle = '#e879f9';
        ctx.lineWidth = 3;
      } else if (isPreview) {
        ctx.fillStyle = '#332812';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
      } else {
        ctx.fillStyle = node.kind === 'keystone' ? '#1c1724' : node.kind === 'notable' ? '#171c2b' : '#121520';
        ctx.strokeStyle = isHovered ? '#e5b96e' : node.kind === 'keystone' ? '#7a5c32' : '#3a425b';
        ctx.lineWidth = isHovered ? 3 : 2;
      }

      ctx.fill();
      ctx.stroke();

      // Inner emblem dot / keystone diamond
      if (node.kind === 'keystone') {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y - 9);
        ctx.lineTo(node.x + 9, node.y);
        ctx.lineTo(node.x, node.y + 9);
        ctx.lineTo(node.x - 9, node.y);
        ctx.closePath();
        ctx.fillStyle = isShared ? '#fbbf24' : '#7a5c32';
        ctx.fill();
      } else if (node.kind === 'notable' || node.kind === 'start') {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = isShared ? '#f3cc82' : isSet1 ? '#22d3ee' : isSet2 ? '#e879f9' : '#4d5878';
        ctx.fill();
      }

      // Labels for Start / Keystone / Notable (and all nodes when zoomed in)
      if (node.kind !== 'small' || camera.zoom >= 0.95 || isHovered || isSearchHit) {
        const label = localizeText(node.name, locale);
        ctx.font =
          node.kind === 'keystone'
            ? 'bold 13px sans-serif'
            : node.kind === 'notable' || node.kind === 'start'
              ? '600 12px sans-serif'
              : '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = isShared || isSet1 || isSet2 || isHovered ? '#fef3c7' : '#9aa4bd';
        ctx.fillText(label, node.x, node.y + r + 5);
      }
    }

    ctx.restore();
  }, [
    camera,
    nodeList,
    tree,
    sharedSet,
    set1Set,
    set2Set,
    previewPathSet,
    hoveredNodeId,
    matchedSearchIds,
    build.game,
    locale,
  ]);

  // Resize observer to re-trigger canvas paint cleanly
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setCamera((c) => ({ ...c }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hitTestNode = (sx: number, sy: number): number | null => {
    const world = screenToWorld(sx, sy);
    for (const node of nodeList) {
      const r = getNodeRadius(node.kind) + 6;
      const dx = world.x - node.x;
      const dy = world.y - node.y;
      if (dx * dx + dy * dy <= r * r) {
        return node.id;
      }
    }
    return null;
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
        togglePassiveNode(clickedId);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setCamera((c) => ({
      ...c,
      zoom: Math.max(0.32, Math.min(2.2, c.zoom * factor)),
    }));
  };

  const hoveredNode = hoveredNodeId !== null ? tree.nodes[hoveredNodeId] : null;

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
        {/* Search */}
        <div className="relative pointer-events-auto">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(locale, 'tree.searchPlaceholder')}
            className="pob-input rounded-md pl-8 pr-3 py-1.5 text-xs w-64 shadow-lg"
          />
          {searchQuery.trim() && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-amber-300 font-mono">
              {matchedSearchIds.size}
            </span>
          )}
        </div>

        {/* PoE 2 Weapon Set Passive Paint Mode */}
        {build.game === 'poe2' && (
          <div className="pointer-events-auto flex items-center gap-1 rounded-md bg-[#11141e]/95 border border-[#2a3147] p-1 shadow-lg text-xs">
            <span className="text-[11px] text-zinc-400 px-1.5">{t(locale, 'tree.paintMode')}:</span>
            <button
              type="button"
              onClick={() => setTreePaintMode('shared')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                treePaintMode === 'shared' ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40' : 'text-zinc-400'
              }`}
            >
              {t(locale, 'tree.paintShared')}
            </button>
            <button
              type="button"
              onClick={() => setTreePaintMode('set1')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                treePaintMode === 'set1' ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40' : 'text-zinc-400'
              }`}
            >
              {t(locale, 'tree.paintSet1')}
            </button>
            <button
              type="button"
              onClick={() => setTreePaintMode('set2')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                treePaintMode === 'set2' ? 'bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-400/40' : 'text-zinc-400'
              }`}
            >
              {t(locale, 'tree.paintSet2')}
            </button>
          </div>
        )}

        {/* Zoom & Reset */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCamera((c) => ({ ...c, zoom: Math.min(2.2, c.zoom * 1.2) }))}
            title={t(locale, 'tree.zoomIn')}
            className="p-1.5 rounded bg-[#141824]/90 border border-[#2a3147] text-zinc-300 hover:text-amber-200 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCamera((c) => ({ ...c, zoom: Math.max(0.32, c.zoom * 0.85) }))}
            title={t(locale, 'tree.zoomOut')}
            className="p-1.5 rounded bg-[#141824]/90 border border-[#2a3147] text-zinc-300 hover:text-amber-200 cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCamera({ x: 0, y: 0, zoom: 0.62 })}
            title={t(locale, 'tree.resetView')}
            className="flex items-center gap-1 px-2 py-1.5 rounded bg-[#141824]/90 border border-[#2a3147] text-xs text-zinc-300 hover:text-amber-200 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            {t(locale, 'tree.resetView')}
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

      {/* Rich Bilingual Hover Tooltip with Live Node Power Delta */}
      {hoveredNode && (
        <div
          className="pointer-events-none absolute z-30 w-72 rounded-md border border-amber-500/45 bg-[#0e111a]/95 shadow-2xl p-3 text-xs backdrop-blur-sm"
          style={{
            left: Math.min(mousePos.x + 18, (containerRef.current?.clientWidth ?? 800) - 300),
            top: Math.min(mousePos.y + 18, (containerRef.current?.clientHeight ?? 600) - 220),
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#262d40] pb-1.5 mb-2">
            <div>
              <div className="font-bold text-amber-200 text-sm">
                {localizeText(hoveredNode.name, locale)}
              </div>
              <div className="text-[10px] text-zinc-400">
                {locale === 'zh-CN' ? hoveredNode.name.en : hoveredNode.name.zh}
              </div>
            </div>
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {t(locale, `tree.${hoveredNode.kind}` as 'tree.keystone' | 'tree.notable' | 'tree.small' | 'tree.start')}
            </span>
          </div>

          <div className="space-y-1 text-sky-200/95">
            {hoveredNode.stats.length === 0 ? (
              <div className="text-zinc-400 italic">{t(locale, 'tree.start')}</div>
            ) : (
              hoveredNode.stats.map((stat, idx) => (
                <div key={idx}>• {localizeStatLine(stat, locale)}</div>
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
                  {Math.round(hoveredPower.dpsDelta).toLocaleString()} ({hoveredPower.dpsDeltaPct >= 0 ? '+' : ''}
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
