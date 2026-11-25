import { KeywordFlag, ModFlag, type GameId, type GemDefinition, type PassiveNode, type PassiveTreeData } from '@webpob/core';
import { getGemsForGame, POE1_GEMS, POE2_GEMS, setRegisteredGems } from './gems.js';
import { getTreeForGame, hasOfficialTreeLoaded, registerTreeData } from './trees.js';

export interface CompactTreeNode {
  id: number;
  en: string;
  zh?: string;
  k: 's' | 'n' | 'K' | 'M' | 'J' | 'S';
  x: number;
  y: number;
  g?: number;
  o?: number;
  r?: number;
  a?: number;
  st?: string[];
  sz?: string[];
  adj: number[];
  cs?: string;
  asc?: string;
  me?: Array<{ id: number; st: string[]; sz?: string[] }>;
}

export interface CompactTreePayload {
  game: GameId;
  version: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  classStartNodeIds: Record<string, number>;
  groups: Record<number, { x: number; y: number }>;
  nodes: CompactTreeNode[];
}

export interface CompactGemLevelEntry {
  bd?: Partial<Record<'Physical' | 'Fire' | 'Cold' | 'Lightning' | 'Chaos', [number, number]>>;
  am?: number;
  de?: number;
  mc?: number;
  st?: string[];
}

export interface CompactGemsPayload {
  game: GameId;
  count: number;
  gems: Array<{
    id: string;
    en: string;
    zh?: string;
    cat: 'active' | 'support';
    color: 'red' | 'green' | 'blue' | 'white';
    tags: string[];
    ct?: number;
    cd?: number;
    cc?: number;
    asm?: number;
    mrp?: number;
    sr?: number;
    bd?: Partial<Record<'Physical' | 'Fire' | 'Cold' | 'Lightning' | 'Chaos', [number, number]>>;
    am?: number;
    de?: number;
    mc?: number;
    st?: string[];
    qs?: Array<{ t: string; q: number }> | Record<string, never>;
    ls?: Record<string, CompactGemLevelEntry>;
  }>;
}

const KIND_MAP: Record<CompactTreeNode['k'], PassiveNode['kind']> = {
  s: 'small',
  n: 'notable',
  K: 'keystone',
  M: 'mastery',
  J: 'jewel',
  S: 'start',
};

const loadedGemsFlag: Partial<Record<GameId, boolean>> = {};

export const OFFICIAL_TREE_FILES: Record<GameId, string> = {
  poe1: 'poe1-tree-3_30.json',
  poe2: 'poe2-tree-0_5.json',
};

export const OFFICIAL_GEMS_FILES: Record<GameId, string> = {
  poe1: 'poe1-gems.json',
  poe2: 'poe2-gems.json',
};

export function hydrateCompactTree(payload: CompactTreePayload): PassiveTreeData {
  const nodes: Record<number, PassiveNode> = {};
  for (const cn of payload.nodes) {
    nodes[cn.id] = {
      id: cn.id,
      name: { en: cn.en, zh: cn.zh ?? cn.en },
      kind: KIND_MAP[cn.k],
      x: cn.x,
      y: cn.y,
      group: cn.g,
      orbit: cn.o,
      orbitRadius: cn.r,
      angle: cn.a,
      stats: cn.st ?? [],
      statsZh: cn.sz,
      adjacent: cn.adj,
      classStartId: cn.cs,
      ascendancyId: cn.asc,
      masteryEffects: cn.me?.map((m) => ({
        id: m.id,
        stats: m.st,
        statsZh: m.sz,
      })),
    };
  }

  return {
    game: payload.game,
    version: payload.version,
    isOfficialFull: true,
    bounds: payload.bounds,
    groups: payload.groups,
    nodes,
    classStartNodeIds: payload.classStartNodeIds,
  };
}

/**
 * Lazily fetches and hydrates the full official PoE 1 (3.30) or PoE 2 (0.5) passive tree
 * from static `/data/*.json` assets in the browser.
 */
export async function loadOfficialTree(game: GameId, basePath = '/data'): Promise<PassiveTreeData> {
  if (hasOfficialTreeLoaded(game)) {
    return getTreeForGame(game);
  }
  const url = `${basePath.replace(/\/+$/, '')}/${OFFICIAL_TREE_FILES[game]}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load official ${game} tree (${res.status})`);
  }
  const payload = (await res.json()) as CompactTreePayload;
  const hydrated = hydrateCompactTree(payload);
  registerTreeData(hydrated);
  return hydrated;
}

function hydrateLevelScaling(
  ls?: Record<string, CompactGemLevelEntry>,
): GemDefinition['levelScaling'] | undefined {
  if (!ls) return undefined;
  const out: NonNullable<GemDefinition['levelScaling']> = {};
  let count = 0;
  for (const [lvStr, snap] of Object.entries(ls)) {
    const lv = Number(lvStr);
    if (!Number.isFinite(lv)) continue;
    out[lv] = {
      ...(snap.bd ? { baseDamage: snap.bd } : {}),
      ...(snap.am !== undefined ? { attackDamageMultiplierPct: snap.am } : {}),
      ...(snap.de !== undefined ? { damageEffectivenessPct: snap.de } : {}),
      ...(snap.mc !== undefined ? { manaCost: snap.mc } : {}),
      ...(snap.st && snap.st.length > 0 ? { stats: snap.st } : {}),
    };
    count++;
  }
  return count > 0 ? out : undefined;
}

function hydrateQualityStats(
  qs?: Array<{ t: string; q: number }> | Record<string, never>,
): GemDefinition['qualityStats'] | undefined {
  if (!qs) return undefined;
  if (!Array.isArray(qs)) return [];
  return qs.map((row) => ({ template: row.t, perQuality: row.q }));
}

function synthesizeGemDefinition(
  game: GameId,
  entry: CompactGemsPayload['gems'][number],
): GemDefinition {
  const tagSet = new Set(entry.tags.map((t) => t.toLowerCase()));
  const isSpell = tagSet.has('spell');
  const isAttack = tagSet.has('attack');
  const isAura = tagSet.has('aura') || tagSet.has('herald') || (entry.mrp ?? 0) > 0 || (entry.sr ?? 0) > 0;

  let modFlags = ModFlag.None;
  let kwFlags = KeywordFlag.None;
  if (isAttack) {
    modFlags |= ModFlag.Attack | ModFlag.Hit;
    kwFlags |= KeywordFlag.Attack | KeywordFlag.Hit;
  }
  if (isSpell) {
    modFlags |= ModFlag.Spell | ModFlag.Hit;
    kwFlags |= KeywordFlag.Spell | KeywordFlag.Hit;
  }
  if (tagSet.has('projectile')) modFlags |= ModFlag.Projectile;
  if (tagSet.has('melee')) modFlags |= ModFlag.Melee;
  if (tagSet.has('area')) modFlags |= ModFlag.Area;
  if (tagSet.has('bow')) modFlags |= ModFlag.Bow;
  if (tagSet.has('fire')) kwFlags |= KeywordFlag.Fire;
  if (tagSet.has('cold')) kwFlags |= KeywordFlag.Cold;
  if (tagSet.has('lightning')) kwFlags |= KeywordFlag.Lightning;
  if (tagSet.has('chaos')) kwFlags |= KeywordFlag.Chaos;
  if (tagSet.has('physical')) kwFlags |= KeywordFlag.Physical;

  const qualityStats = hydrateQualityStats(entry.qs);
  const levelScaling = hydrateLevelScaling(entry.ls);

  if (entry.cat === 'support') {
    const hasOfficialStats = Array.isArray(entry.st) && entry.st.length > 0;
    const lowerEn = entry.en.toLowerCase();
    const isSpecialLevelSupport =
      lowerEn === 'empower' ||
      lowerEn === 'awakened empower' ||
      lowerEn === 'enhance' ||
      lowerEn === 'awakened enhance' ||
      lowerEn === 'enlighten' ||
      lowerEn === 'awakened enlighten';
    const defaultStat = tagSet.has('fire')
      ? '25% more Fire Damage'
      : tagSet.has('cold')
        ? '25% more Cold Damage'
        : tagSet.has('lightning')
          ? '25% more Lightning Damage'
          : tagSet.has('physical')
            ? '25% more Physical Damage'
            : tagSet.has('attack')
              ? '20% more Attack Damage'
              : tagSet.has('spell')
                ? '20% more Spell Damage'
                : '18% more Damage';
    return {
      id: entry.id,
      name: { en: entry.en, zh: entry.zh ?? entry.en },
      category: 'support',
      game,
      color: entry.color,
      tags: entry.tags,
      modFlags,
      keywordFlags: kwFlags,
      stats: hasOfficialStats ? entry.st! : isSpecialLevelSupport ? [] : [defaultStat],
      ...(qualityStats ? { qualityStats } : {}),
      ...(levelScaling ? { levelScaling } : {}),
    };
  }

  // Active gem: prefer official Lua-exported Lv.20 numbers when present, fallback otherwise
  const primaryDamageType = tagSet.has('fire')
    ? 'Fire'
    : tagSet.has('cold')
      ? 'Cold'
      : tagSet.has('lightning')
        ? 'Lightning'
        : tagSet.has('chaos')
          ? 'Chaos'
          : 'Physical';

  const officialStats = Array.isArray(entry.st) ? entry.st : [];

  return {
    id: entry.id,
    name: { en: entry.en, zh: entry.zh ?? entry.en },
    category: 'active',
    game,
    color: entry.color,
    tags: entry.tags,
    modFlags,
    keywordFlags: kwFlags,
    isAuraOrBuff: isAura,
    ...(entry.cd && entry.cd > 0 ? { cooldown: entry.cd } : {}),
    ...(qualityStats ? { qualityStats } : {}),
    ...(levelScaling ? { levelScaling } : {}),
    ...(isAura
      ? {
          manaReservationPct: entry.mrp ?? (game === 'poe1' ? 35 : undefined),
          spiritReservation: entry.sr ?? (game === 'poe2' ? 30 : undefined),
          stats: officialStats.length > 0 ? officialStats : [`15% more ${primaryDamageType} Damage`],
        }
      : isAttack
        ? {
            attackDamageMultiplierPct: entry.am ?? 145,
            damageEffectivenessPct: entry.de ?? entry.am ?? 145,
            attackSpeedMultiplier: entry.asm ?? 1.0,
            manaCost: entry.mc ?? 12,
            stats: officialStats,
          }
        : {
            baseDamage: entry.bd ?? { [primaryDamageType]: [420, 760] as [number, number] },
            damageEffectivenessPct: entry.de ?? 120,
            castTime: entry.ct ?? 0.75,
            baseCritChance: entry.cc ?? (game === 'poe2' ? 9 : 6),
            manaCost: entry.mc ?? 22,
            stats: officialStats,
          }),
  };
}

function normalizeGemNameKey(name: string): string {
  return name.toLowerCase().trim().replace(/\s+support$/i, '');
}

export function registerGemsData(game: GameId, payload: CompactGemsPayload): GemDefinition[] {
  const curated = game === 'poe2' ? POE2_GEMS : POE1_GEMS;
  const payloadByKey = new Map(payload.gems.map((e) => [normalizeGemNameKey(e.en), e]));
  const seenEn = new Set<string>();
  const merged: GemDefinition[] = curated.map((g) => {
    const key = normalizeGemNameKey(g.name.en);
    seenEn.add(key);
    const official = payloadByKey.get(key);
    if (!official) return g;
    const ls = hydrateLevelScaling(official.ls);
    return {
      ...g,
      ...(ls && !g.levelScaling ? { levelScaling: ls } : {}),
    };
  });

  for (const entry of payload.gems) {
    const key = normalizeGemNameKey(entry.en);
    if (seenEn.has(key)) continue;
    seenEn.add(key);
    merged.push(synthesizeGemDefinition(game, entry));
  }
  setRegisteredGems(game, merged);
  loadedGemsFlag[game] = true;
  return merged;
}

export async function loadOfficialGems(game: GameId, basePath = '/data'): Promise<GemDefinition[]> {
  if (loadedGemsFlag[game]) {
    return getGemsForGame(game);
  }
  const url = `${basePath.replace(/\/+$/, '')}/${OFFICIAL_GEMS_FILES[game]}`;
  const res = await fetch(url);
  if (!res.ok) {
    return getGemsForGame(game);
  }
  const payload = (await res.json()) as CompactGemsPayload;
  return registerGemsData(game, payload);
}
