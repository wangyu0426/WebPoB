/// <reference lib="webworker" />
import type { Build, GameId } from '@webpob/core';
import {
  loadOfficialBaseItems,
  loadOfficialGems,
  loadOfficialTree,
} from '@webpob/data';
import { calculateBuild, computeNodePower } from '@webpob/calc';

export interface NodePowerHeatItem {
  nodeId: number;
  dpsDeltaPct: number;
  ehpDeltaPct: number;
}

export type CalcWorkerRequest =
  | {
      type: 'HEATMAP';
      requestId: number;
      build: Build;
      candidateNodeIds: number[];
    };

export type CalcWorkerResponse =
  | {
      type: 'HEATMAP_RESULT';
      requestId: number;
      items: NodePowerHeatItem[];
      durationMs: number;
    }
  | {
      type: 'ERROR';
      requestId: number;
      message: string;
    };

const loadedGames = new Set<GameId>();

async function ensureWorkerData(game: GameId) {
  if (loadedGames.has(game)) return;
  await Promise.all([
    loadOfficialTree(game),
    loadOfficialGems(game),
    loadOfficialBaseItems(game),
  ]);
  loadedGames.add(game);
}

self.onmessage = async (ev: MessageEvent<CalcWorkerRequest>) => {
  const msg = ev.data;
  if (msg.type === 'HEATMAP') {
    const t0 = performance.now();
    try {
      await ensureWorkerData(msg.build.game);
      const baseline = calculateBuild(msg.build);
      const baseEhp = Math.max(1, baseline.defence.effectiveHitPool);
      const items: NodePowerHeatItem[] = [];

      for (const nodeId of msg.candidateNodeIds) {
        const delta = computeNodePower(msg.build, nodeId, baseline);
        if (delta.isAllocated) continue;
        const ehpDeltaPct = Math.round((delta.ehpDelta / baseEhp) * 1000) / 10;
        if (delta.dpsDeltaPct > 0.5 || ehpDeltaPct > 0.5) {
          items.push({
            nodeId,
            dpsDeltaPct: delta.dpsDeltaPct,
            ehpDeltaPct,
          });
        }
      }

      const res: CalcWorkerResponse = {
        type: 'HEATMAP_RESULT',
        requestId: msg.requestId,
        items,
        durationMs: Math.round(performance.now() - t0),
      };
      self.postMessage(res);
    } catch (err) {
      const res: CalcWorkerResponse = {
        type: 'ERROR',
        requestId: msg.requestId,
        message: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(res);
    }
  }
};
