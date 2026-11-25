import type { Build, GameId } from '@webpob/core';

export interface SavedBuildRecord {
  id: string;
  name: string;
  game: GameId;
  classId: string;
  ascendancyId: string;
  level: number;
  dps: number;
  life: number;
  energyShield: number;
  updatedAt: number;
  build: Build;
}

const DB_NAME = 'webpob_library_v1';
const STORE_NAME = 'builds';
const FALLBACK_KEY = 'webpob_library_fallback_v1';

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function readFallback(): SavedBuildRecord[] {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedBuildRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFallback(records: SavedBuildRecord[]): void {
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(records));
  } catch {
    // ignore storage quota errors
  }
}

export async function listSavedBuilds(): Promise<SavedBuildRecord[]> {
  const db = await openDb();
  if (!db) {
    return readFallback().sort((a, b) => b.updatedAt - a.updatedAt);
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const rows = (req.result as SavedBuildRecord[]) ?? [];
        resolve(rows.sort((a, b) => b.updatedAt - a.updatedAt));
      };
      req.onerror = () => resolve(readFallback());
    } catch {
      resolve(readFallback());
    }
  });
}

export async function saveBuildRecord(record: SavedBuildRecord): Promise<void> {
  const db = await openDb();
  if (!db) {
    const existing = readFallback().filter((r) => r.id !== record.id);
    writeFallback([record, ...existing]);
    return;
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        const existing = readFallback().filter((r) => r.id !== record.id);
        writeFallback([record, ...existing]);
        resolve();
      };
    } catch {
      resolve();
    }
  });
}

export async function deleteSavedBuild(id: string): Promise<void> {
  const db = await openDb();
  if (!db) {
    writeFallback(readFallback().filter((r) => r.id !== id));
    return;
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function exportLibraryJson(): Promise<string> {
  const records = await listSavedBuilds();
  return JSON.stringify(
    {
      format: 'webpob-library-v1',
      exportedAt: new Date().toISOString(),
      count: records.length,
      records,
    },
    null,
    2,
  );
}

export async function importLibraryJson(jsonStr: string): Promise<number> {
  const parsed = JSON.parse(jsonStr) as { records?: unknown } | SavedBuildRecord[];
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.records)
      ? (parsed.records as SavedBuildRecord[])
      : [];
  let imported = 0;
  for (const item of list) {
    if (
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      (item.game === 'poe1' || item.game === 'poe2') &&
      item.build &&
      typeof item.build === 'object'
    ) {
      await saveBuildRecord({
        ...item,
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
      });
      imported++;
    }
  }
  return imported;
}
