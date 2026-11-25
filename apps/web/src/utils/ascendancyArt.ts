export interface Poe1SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Poe2AscBgMeta {
  x: number;
  y: number;
  width: number;
  height: number;
  file: string;
}

export interface AscendancyArtManifest {
  poe1: {
    sheet: string;
    sprites: Record<string, Poe1SpriteRect>;
  };
  poe2: {
    ring: string;
    portraits: Record<string, string>;
    ascendancies: Record<string, Poe2AscBgMeta>;
  };
}

let manifestPromise: Promise<AscendancyArtManifest | null> | null = null;
let cachedManifest: AscendancyArtManifest | null = null;

export function loadAscendancyArtManifest(): Promise<AscendancyArtManifest | null> {
  if (cachedManifest) return Promise.resolve(cachedManifest);
  if (!manifestPromise) {
    manifestPromise = fetch('/data/ascendancy-art.json')
      .then((r) => (r.ok ? (r.json() as Promise<AscendancyArtManifest>) : null))
      .then((data) => {
        cachedManifest = data;
        return data;
      })
      .catch(() => null);
  }
  return manifestPromise;
}

const imageCache = new Map<string, HTMLImageElement>();
const imageCallbacks = new Map<string, Set<() => void>>();

/**
 * Returns a ready-to-draw `HTMLImageElement` if already loaded, or starts lazy-loading it
 * and invokes `onLoad` once complete so the Canvas can repaint cleanly.
 */
export function getCachedArtImage(url: string, onLoad?: () => void): HTMLImageElement | null {
  const existing = imageCache.get(url);
  if (existing) {
    if (existing.complete && existing.naturalWidth > 0) return existing;
    if (onLoad) {
      let cbs = imageCallbacks.get(url);
      if (!cbs) {
        cbs = new Set();
        imageCallbacks.set(url, cbs);
      }
      cbs.add(onLoad);
    }
    return null;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  imageCache.set(url, img);
  const cbs = new Set<() => void>();
  if (onLoad) cbs.add(onLoad);
  imageCallbacks.set(url, cbs);

  img.onload = () => {
    const waiting = imageCallbacks.get(url);
    if (waiting) {
      for (const fn of waiting) fn();
      waiting.clear();
    }
  };
  img.onerror = () => {
    imageCallbacks.delete(url);
  };
  img.src = url;
  return null;
}

export function resolvePoe1SpriteRect(
  manifest: AscendancyArtManifest | null,
  ascendancyId?: string,
): Poe1SpriteRect | null {
  if (!manifest || !ascendancyId) return null;
  const sprites = manifest.poe1.sprites;
  const trimmed = ascendancyId.trim();
  if (sprites[trimmed]) return sprites[trimmed]!;
  // PoE 1 3.30 Warden uses ClassesRaider in sprites.lua
  if (trimmed.toLowerCase() === 'warden' && sprites['Raider']) return sprites['Raider']!;
  const lower = trimmed.toLowerCase();
  for (const [k, v] of Object.entries(sprites)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

export function resolvePoe2PortraitFile(
  manifest: AscendancyArtManifest | null,
  ascendancyId?: string,
  classId?: string,
): string | null {
  if (!manifest) return null;
  const portraits = manifest.poe2.portraits;
  const candidates = [ascendancyId, classId].filter((s): s is string => Boolean(s && s.trim() && s !== 'None'));
  for (const raw of candidates) {
    const t = raw.trim();
    if (portraits[t]) return portraits[t]!;
    const lower = t.toLowerCase();
    for (const [k, v] of Object.entries(portraits)) {
      if (k.toLowerCase() === lower) return v;
    }
  }
  return null;
}

export function resolvePoe2AscBgMeta(
  manifest: AscendancyArtManifest | null,
  ascendancyId?: string,
): Poe2AscBgMeta | null {
  if (!manifest || !ascendancyId) return null;
  const map = manifest.poe2.ascendancies;
  const trimmed = ascendancyId.trim();
  if (map[trimmed]) return map[trimmed]!;
  const lower = trimmed.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}
