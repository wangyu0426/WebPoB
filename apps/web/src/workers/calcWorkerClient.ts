import type { Build } from '@webpob/core';
import type {
  CalcWorkerRequest,
  CalcWorkerResponse,
  NodePowerHeatItem,
} from './calc.worker';

let workerInstance: Worker | null = null;
let seq = 0;
const pending = new Map<
  number,
  {
    resolve: (res: { items: NodePowerHeatItem[]; durationMs: number }) => void;
    reject: (err: Error) => void;
  }
>();

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!workerInstance) {
    workerInstance = new Worker(new URL('./calc.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerInstance.onmessage = (ev: MessageEvent<CalcWorkerResponse>) => {
      const msg = ev.data;
      const entry = pending.get(msg.requestId);
      if (!entry) return;
      pending.delete(msg.requestId);
      if (msg.type === 'HEATMAP_RESULT') {
        entry.resolve({ items: msg.items, durationMs: msg.durationMs });
      } else {
        entry.reject(new Error(msg.message));
      }
    };
    workerInstance.onerror = (err) => {
      for (const [, p] of pending) {
        p.reject(new Error(err.message || 'Calc worker error'));
      }
      pending.clear();
    };
  }
  return workerInstance;
}

/**
 * Offloads batch NodePower heatmap scoring across candidate Notables/Keystones
 * into a dedicated background Web Worker so the passive tree canvas stays 60fps.
 */
export function computeHeatmapInWorker(
  build: Build,
  candidateNodeIds: number[],
): Promise<{ items: NodePowerHeatItem[]; durationMs: number }> {
  const worker = getWorker();
  if (!worker) {
    return Promise.resolve({ items: [], durationMs: 0 });
  }
  const requestId = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(requestId, { resolve, reject });
    const req: CalcWorkerRequest = {
      type: 'HEATMAP',
      requestId,
      build,
      candidateNodeIds,
    };
    worker.postMessage(req);
  });
}
