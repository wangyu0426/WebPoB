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

function synthesizeGemDefinition(
  game: GameId,
  entry: CompactGemsPayload['gems'][number],
): GemDefinition {
  const tagSet = new Set(entry.tags.map((t) => t.toLowerCase()));
  const isSpell = tagSet.has('spell');
  const isAttack = tagSet.has('attack');
  const isAura = tagSet.has('aura') || tagSet.has('herald');

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
  if (tagSet.has('fire')) kwFlags |= KeywordFlag.Fire;
  if (tagSet.has('cold')) kwFlags |= KeywordFlag.Cold;
  if (tagSet.has('lightning')) kwFlags |= KeywordFlag.Lightning;
  if (tagSet.has('chaos')) kwFlags |= KeywordFlag.Chaos;
  if (tagSet.has('physical')) kwFlags |= KeywordFlag.Physical;

  if (entry.cat === 'support') {
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
      stats: [defaultStat],
    };
  }

  // Active gem fallback scaling
  const primaryDamageType = tagSet.has('fire')
    ? 'Fire'
    : tagSet.has('cold')
      ? 'Cold'
      : tagSet.has('lightning')
        ? 'Lightning'
        : tagSet.has('chaos')
          ? 'Chaos'
          : 'Physical';

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
    ...(isAura
      ? {
          manaReservationPct: game === 'poe1' ? 35 : undefined,
          spiritReservation: game === 'poe2' ? 30 : undefined,
          stats: [`15% more ${primaryDamageType} Damage`],
        }
      : isAttack
        ? {
            attackDamageMultiplierPct: 145,
            damageEffectivenessPct: 145,
            attackSpeedMultiplier: 1.0,
            manaCost: 12,
            stats: [],
          }
        : {
            baseDamage: { [primaryDamageType]: [420, 760] as [number, number] },
            damageEffectivenessPct: 120,
            castTime: 0.75,
            baseCritChance: game === 'poe2' ? 9 : 6,
            manaCost: 22,
            stats: [],
          }),
  };
}

export function registerGemsData(game: GameId, payload: CompactGemsPayload): GemDefinition[] {
  const curated = game === 'poe2' ? POE2_GEMS : POE1_GEMS;
  const seenEn = new Set(curated.map((g) => g.name.en.toLowerCase()));
  const merged = [...curated];

  for (const entry of payload.gems) {
    if (seenEn.has(entry.en.toLowerCase())) continue;
    seenEn.add(entry.en.toLowerCase());
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
