import { KeywordFlag, ModFlag, type GemDefinition } from '@webpob/core';
import { normalizeStatLineToEn } from '@webpob/i18n';
import type { ModDB } from './modDb.js';

const KNOWN_GEM_FILTER_TOKENS = new Set([
  'all',
  'active',
  'support',
  'spell',
  'attack',
  'melee',
  'projectile',
  'bow',
  'area',
  'minion',
  'aura',
  'curse',
  'herald',
  'movement',
  'warcry',
  'totem',
  'trap',
  'mine',
  'fire',
  'cold',
  'lightning',
  'physical',
  'chaos',
  'elemental',
  'strength',
  'dexterity',
  'intelligence',
  'vaal',
  'channelling',
  'duration',
  'brand',
  'strike',
  'slam',
]);

/**
 * Normalizes a qualifier string (e.g. "Lightning Spell", "Physical Spell", "Fire", "")
 * into a canonical "+"-delimited filter key (e.g. "lightning+spell", "fire", "all"),
 * or returns `null` if it contains an unsupported/unmatched qualifier (e.g. "Corrupted").
 */
export function normalizeGemFilterTokens(rawFilter?: string): string | null {
  if (!rawFilter || !rawFilter.trim()) return 'all';
  const tokens = rawFilter
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((tok) => tok !== 'all' && tok !== 'skill' && tok !== 'skills' && tok !== 'gem' && tok !== 'gems');
  if (tokens.length === 0) return 'all';
  for (const tok of tokens) {
    if (!KNOWN_GEM_FILTER_TOKENS.has(tok)) return null;
  }
  return Array.from(new Set(tokens)).sort().join('+');
}

function gemMatchesToken(def: GemDefinition, token: string): boolean {
  if (token === 'all') return true;
  if (token === 'active') return def.category === 'active';
  if (token === 'support') return def.category === 'support';
  if (token === 'strength') return def.color === 'red';
  if (token === 'dexterity') return def.color === 'green';
  if (token === 'intelligence') return def.color === 'blue';

  const tagSet = new Set(def.tags.map((t) => t.toLowerCase()));
  if (tagSet.has(token)) return true;

  switch (token) {
    case 'spell':
      return (def.modFlags & ModFlag.Spell) !== 0 || (def.keywordFlags & KeywordFlag.Spell) !== 0;
    case 'attack':
      return (def.modFlags & ModFlag.Attack) !== 0 || (def.keywordFlags & KeywordFlag.Attack) !== 0;
    case 'melee':
      return (def.modFlags & ModFlag.Melee) !== 0;
    case 'projectile':
      return (def.modFlags & ModFlag.Projectile) !== 0;
    case 'bow':
      return (def.modFlags & ModFlag.Bow) !== 0;
    case 'area':
      return (def.modFlags & ModFlag.Area) !== 0;
    case 'fire':
      return (def.keywordFlags & KeywordFlag.Fire) !== 0;
    case 'cold':
      return (def.keywordFlags & KeywordFlag.Cold) !== 0;
    case 'lightning':
      return (def.keywordFlags & KeywordFlag.Lightning) !== 0;
    case 'physical':
      return (def.keywordFlags & KeywordFlag.Physical) !== 0;
    case 'chaos':
      return (def.keywordFlags & KeywordFlag.Chaos) !== 0;
    case 'elemental':
      return (
        tagSet.has('fire') ||
        tagSet.has('cold') ||
        tagSet.has('lightning') ||
        (def.keywordFlags & (KeywordFlag.Fire | KeywordFlag.Cold | KeywordFlag.Lightning)) !== 0
      );
    case 'minion':
      return (def.keywordFlags & KeywordFlag.Minion) !== 0 || Boolean(def.minionBase);
    case 'aura':
      return (def.keywordFlags & KeywordFlag.Aura) !== 0;
    case 'curse':
      return (def.keywordFlags & KeywordFlag.Curse) !== 0;
    case 'totem':
      return (def.keywordFlags & KeywordFlag.Totem) !== 0;
    case 'trap':
      return (def.keywordFlags & KeywordFlag.Trap) !== 0;
    case 'mine':
      return (def.keywordFlags & KeywordFlag.Mine) !== 0;
    case 'movement':
      return (def.keywordFlags & KeywordFlag.Movement) !== 0;
    case 'warcry':
      return (def.keywordFlags & KeywordFlag.Warcry) !== 0;
    default:
      return false;
  }
}

export function gemMatchesFilterKey(def: GemDefinition, filterKey: string): boolean {
  if (filterKey === 'all') return true;
  const tokens = filterKey.split('+');
  for (const tok of tokens) {
    if (!gemMatchesToken(def, tok)) return false;
  }
  return true;
}

export interface SocketedGemBonusRule {
  kind: 'level' | 'quality';
  filterKey: string;
  activeOnly: boolean;
  supportOnly: boolean;
  value: number;
}

/**
 * Extracts `+N to Level of Socketed [...] Gems` and `+N% to Quality of Socketed [...] Gems`
 * from an item's implicit + explicit mod lines (scoped strictly to gems socketed in that slot).
 */
export function parseSocketedGemBonuses(lines: readonly string[]): SocketedGemBonusRule[] {
  const rules: SocketedGemBonusRule[] = [];
  for (const raw of lines) {
    const line = normalizeStatLineToEn(raw);
    if (!line) continue;

    // +N to Level of Socketed [Filter] [Active Skill | Skill | Support |] Gems
    let m = line.match(
      /^\+(\d+) to Level of Socketed (?:([A-Za-z ]+?) )?(Active Skill |Skill |Support )?Gems?$/i,
    );
    if (m) {
      const val = Number(m[1]);
      const rawFilter = (m[2] ?? '').trim();
      const scopeRaw = (m[3] ?? '').trim().toLowerCase();
      const filterKey = normalizeGemFilterTokens(rawFilter);
      if (filterKey && val > 0) {
        rules.push({
          kind: 'level',
          filterKey,
          activeOnly: scopeRaw === 'active skill' || scopeRaw === 'skill',
          supportOnly: scopeRaw === 'support' || filterKey.split('+').includes('support'),
          value: val,
        });
      }
      continue;
    }

    // +N% to Quality of Socketed [Filter] [Active Skill | Skill | Support |] Gems
    m = line.match(
      /^\+(\d+)% to Quality of Socketed (?:([A-Za-z ]+?) )?(Active Skill |Skill |Support )?Gems?$/i,
    );
    if (m) {
      const val = Number(m[1]);
      const rawFilter = (m[2] ?? '').trim();
      const scopeRaw = (m[3] ?? '').trim().toLowerCase();
      const filterKey = normalizeGemFilterTokens(rawFilter);
      if (filterKey && val > 0) {
        rules.push({
          kind: 'quality',
          filterKey,
          activeOnly: scopeRaw === 'active skill' || scopeRaw === 'skill',
          supportOnly: scopeRaw === 'support' || filterKey.split('+').includes('support'),
          value: val,
        });
      }
    }
  }
  return rules;
}

/**
 * Evaluates total global + socketed gem level & quality bonuses for a specific gem.
 */
export function resolveGemBonuses(
  def: GemDefinition,
  globalDb: ModDB,
  socketedRules: readonly SocketedGemBonusRule[],
): { levelBonus: number; qualityBonus: number } {
  let levelBonus = 0;
  let qualityBonus = 0;

  // 1. Global bonuses (`+N to Level of all ... Skill Gems / Skills`, `+N% to Quality of all Skill Gems`)
  // Global "Skill Gems / Skills" mods apply to active skill gems (including auras/curses/heralds),
  // unless specifically scoped to Support Gems (`GemLevelSup:`).
  if (def.category === 'active') {
    for (const [key, mods] of globalDb.entriesByPrefix('GemLevel:')) {
      const filterKey = key.slice('GemLevel:'.length);
      if (!gemMatchesFilterKey(def, filterKey)) continue;
      for (const m of mods) {
        if (m.type === 'BASE' && typeof m.value === 'number') {
          levelBonus += m.value;
        }
      }
    }
    for (const [key, mods] of globalDb.entriesByPrefix('GemQuality:')) {
      const filterKey = key.slice('GemQuality:'.length);
      if (!gemMatchesFilterKey(def, filterKey)) continue;
      for (const m of mods) {
        if (m.type === 'BASE' && typeof m.value === 'number') {
          qualityBonus += m.value;
        }
      }
    }
  } else if (def.category === 'support') {
    for (const [key, mods] of globalDb.entriesByPrefix('GemLevelSup:')) {
      const filterKey = key.slice('GemLevelSup:'.length);
      if (!gemMatchesFilterKey(def, filterKey)) continue;
      for (const m of mods) {
        if (m.type === 'BASE' && typeof m.value === 'number') {
          levelBonus += m.value;
        }
      }
    }
  }

  // 2. Socketed item bonuses (`+N to Level of Socketed ... Gems`)
  for (const rule of socketedRules) {
    if (rule.activeOnly && def.category !== 'active') continue;
    if (rule.supportOnly && def.category !== 'support') continue;
    if (!gemMatchesFilterKey(def, rule.filterKey)) continue;
    if (rule.kind === 'level') {
      levelBonus += rule.value;
    } else {
      qualityBonus += rule.value;
    }
  }

  return { levelBonus, qualityBonus };
}
