import type {
  CharacterClassDef,
  GameId,
  GemDefinition,
  Locale,
  PassiveTreeData,
} from '@webpob/core';
import { getClassesForGame } from './classes.js';
import type { ClusterNotableDef } from './clusters.js';
import { getAllClusterNotables } from './clusters.js';
import { getGemsForGame } from './gems.js';
import { getTreeForGame } from './trees.js';
import type { CompactUniqueEntry } from './uniques.js';
import { getUniquesForGame } from './uniques.js';

export interface LocaleOverlayPack {
  game: GameId;
  locale: 'zh-TW';
  source: string;
  generatedAt: string;
  classes: Record<string, string>;
  ascendancies: Record<string, string>;
  nodes: Record<string, string>;
  nodeStats: Record<string, string[]>;
  masteries: Record<string, string[]>;
  gems: Record<string, string>;
  bases: Record<string, string>;
  uniques: Record<string, string>;
  clusters?: Record<string, string>;
  clusterStats?: Record<string, string[]>;
}

export const OFFICIAL_I18N_FILES: Record<GameId, Partial<Record<Locale, string>>> = {
  poe1: { 'zh-TW': 'poe1-i18n-zh-TW.json' },
  poe2: { 'zh-TW': 'poe2-i18n-zh-TW.json' },
};

const overlayCache: Record<GameId, Partial<Record<Locale, LocaleOverlayPack>>> = {
  poe1: {},
  poe2: {},
};

const baseLookupLower: Record<GameId, Map<string, string>> = {
  poe1: new Map(),
  poe2: new Map(),
};

const uniqueLookupLower: Record<GameId, Map<string, string>> = {
  poe1: new Map(),
  poe2: new Map(),
};

const inflightPromises = new Map<string, Promise<LocaleOverlayPack | null>>();

export function getLocaleOverlay(game: GameId, locale: Locale): LocaleOverlayPack | undefined {
  return overlayCache[game][locale];
}

export function hasLocaleOverlayLoaded(game: GameId, locale: Locale): boolean {
  return Boolean(overlayCache[game][locale]);
}

export function applyLocaleOverlayToClasses(game: GameId, classes: CharacterClassDef[]): void {
  const pack = overlayCache[game]['zh-TW'];
  if (!pack) return;
  for (const cls of classes) {
    const twCls = pack.classes[cls.id] ?? pack.classes[cls.name.en];
    if (twCls) cls.name.zhTw = twCls;
    for (const asc of cls.ascendancies) {
      const twAsc = pack.ascendancies[asc.id] ?? pack.ascendancies[asc.name.en];
      if (twAsc) asc.name.zhTw = twAsc;
    }
  }
}

export function applyLocaleOverlayToTree(tree: PassiveTreeData): void {
  const pack = overlayCache[tree.game]['zh-TW'];
  if (!pack) return;
  for (const node of Object.values(tree.nodes)) {
    const key = String(node.id);
    const twName = pack.nodes[key];
    if (twName) node.name.zhTw = twName;
    const twStats = pack.nodeStats[key];
    if (twStats && twStats.length > 0) {
      node.statsZhTw = twStats.map((line, i) => line || node.statsZh?.[i] || node.stats[i] || '');
    }
    if (node.masteryEffects) {
      for (const me of node.masteryEffects) {
        const twMe = pack.masteries[String(me.id)];
        if (twMe && twMe.length > 0) {
          me.statsZhTw = twMe.map((line, i) => line || me.statsZh?.[i] || me.stats[i] || '');
        }
      }
    }
  }
}

export function applyLocaleOverlayToGems(game: GameId, gems: GemDefinition[]): void {
  const pack = overlayCache[game]['zh-TW'];
  if (!pack) return;
  for (const gem of gems) {
    const tw = pack.gems[gem.id];
    if (tw) gem.name.zhTw = tw;
  }
}

export function applyLocaleOverlayToUniques(game: GameId, uniques: CompactUniqueEntry[]): void {
  const pack = overlayCache[game]['zh-TW'];
  if (!pack) return;
  for (const u of uniques) {
    const twName = pack.uniques[u.en] ?? uniqueLookupLower[game].get(u.en.toLowerCase());
    if (twName) u.zhTw = twName;
    const twBase = pack.bases[u.b] ?? baseLookupLower[game].get(u.b.toLowerCase());
    if (twBase) u.bzTw = twBase;
  }
}

export function applyLocaleOverlayToClusters(clusters: ClusterNotableDef[]): void {
  const pack = overlayCache.poe1['zh-TW'];
  if (!pack?.clusters) return;
  const byLower = new Map<string, string>();
  const statsByLower = new Map<string, string[]>();
  for (const [k, v] of Object.entries(pack.clusters)) {
    byLower.set(k.toLowerCase(), v);
  }
  for (const [k, v] of Object.entries(pack.clusterStats ?? {})) {
    statsByLower.set(k.toLowerCase(), v);
  }
  for (const def of clusters) {
    const key = def.en.toLowerCase();
    const tw = byLower.get(key);
    if (tw) def.zhTw = tw;
    const st = statsByLower.get(key);
    if (st && st.length > 0) {
      def.szTw = st.map((line, i) => line || def.sz?.[i] || def.st[i] || '');
    }
  }
}

/**
 * Registers an official locale overlay pack (e.g. `zh-TW`) in memory and patches
 * all currently loaded trees, classes, gems, uniques, and clusters for that game.
 */
export function registerLocaleOverlay(
  game: GameId,
  locale: 'zh-TW',
  pack: LocaleOverlayPack,
): LocaleOverlayPack {
  overlayCache[game][locale] = pack;

  baseLookupLower[game].clear();
  for (const [en, tw] of Object.entries(pack.bases ?? {})) {
    baseLookupLower[game].set(en.toLowerCase(), tw);
  }
  uniqueLookupLower[game].clear();
  for (const [en, tw] of Object.entries(pack.uniques ?? {})) {
    uniqueLookupLower[game].set(en.toLowerCase(), tw);
  }

  applyLocaleOverlayToClasses(game, getClassesForGame(game));
  applyLocaleOverlayToTree(getTreeForGame(game));
  applyLocaleOverlayToGems(game, getGemsForGame(game));
  applyLocaleOverlayToUniques(game, getUniquesForGame(game));
  if (game === 'poe1') {
    applyLocaleOverlayToClusters(getAllClusterNotables());
  }

  return pack;
}

/**
 * Looks up the official Traditional Chinese base item name when the `zh-TW` overlay is loaded.
 */
export function getLocalizedBaseName(
  enBaseName: string,
  locale: Locale,
  game: GameId,
  fallbackZh?: string,
): string {
  if (locale === 'en') return enBaseName;
  if (locale === 'zh-TW') {
    const tw = baseLookupLower[game].get(enBaseName.toLowerCase().trim());
    if (tw) return tw;
  }
  return fallbackZh || enBaseName;
}

/**
 * Looks up the official Traditional Chinese unique item name when the `zh-TW` overlay is loaded.
 */
export function getLocalizedUniqueName(
  enName: string,
  locale: Locale,
  game: GameId,
  fallbackZh?: string,
): string {
  if (locale === 'en') return enName;
  if (locale === 'zh-TW') {
    const tw = uniqueLookupLower[game].get(enName.toLowerCase().trim());
    if (tw) return tw;
  }
  return fallbackZh || enName;
}

/**
 * On-demand loader for optional locale overlay packs (such as `zh-TW`).
 * No-ops for `en` and `zh-CN` (already baked into primary data files).
 */
export async function loadLocaleOverlay(
  game: GameId,
  locale: Locale,
  basePath = '/data',
  manifestFilename?: string,
): Promise<LocaleOverlayPack | null> {
  if (locale !== 'zh-TW') return null;
  if (overlayCache[game][locale]) return overlayCache[game][locale]!;

  const filename = manifestFilename ?? OFFICIAL_I18N_FILES[game]?.[locale];
  if (!filename) return null;

  const inflightKey = `${game}:${locale}:${filename}`;
  const existing = inflightPromises.get(inflightKey);
  if (existing) return existing;

  const url = `${basePath.replace(/\/+$/, '')}/${filename}`;
  const promise = (async () => {
    try {
      if (typeof fetch !== 'function') return null;
      const res = await fetch(url);
      if (!res.ok) return null;
      const pack = (await res.json()) as LocaleOverlayPack;
      if (!pack || pack.game !== game) return null;
      return registerLocaleOverlay(game, locale, pack);
    } catch {
      return null;
    } finally {
      inflightPromises.delete(inflightKey);
    }
  })();

  inflightPromises.set(inflightKey, promise);
  return promise;
}
