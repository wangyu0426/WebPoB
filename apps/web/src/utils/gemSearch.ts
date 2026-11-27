import type { GemDefinition, Locale } from '@webpob/core';
import { localizeText, toSimplifiedZh } from '@webpob/i18n';

export type GemCategoryFilter = 'all' | 'active' | 'support';

export interface GemSearchResult {
  items: GemDefinition[];
  totalMatched: number;
  totalActive: number;
  totalSupport: number;
}

const ZH_TAG_ALIASES: Record<string, string[]> = {
  '法术': ['spell'],
  '攻击': ['attack'],
  '投射物': ['projectile'],
  '火焰': ['fire'],
  '冰霜': ['cold'],
  '闪电': ['lightning'],
  '混沌': ['chaos'],
  '物理': ['physical'],
  '元素': ['elemental', 'fire', 'cold', 'lightning'],
  '召唤': ['minion'],
  '图腾': ['totem'],
  '光环': ['aura'],
  '诅咒': ['curse', 'hex', 'mark'],
  '近战': ['melee'],
  '弓': ['bow'],
  '法杖': ['wand'],
  '范围': ['aoe', 'area'],
  '持续': ['duration', 'dot'],
  '触发': ['trigger', 'meta'],
  '位移': ['movement', 'travel'],
  '战吼': ['warcry'],
  '暴击': ['critical'],
  '陷阱': ['trap'],
  '地雷': ['mine'],
  '捷': ['herald'],
  '精魂': ['spirit', 'persistent'],
};

function expandToken(token: string): string[] {
  const simplified = toSimplifiedZh(token);
  const aliases = ZH_TAG_ALIASES[token] ?? ZH_TAG_ALIASES[simplified];
  const base = simplified !== token ? [token, simplified] : [token];
  return aliases ? [...base, ...aliases] : base;
}

function scoreGemMatch(
  gem: GemDefinition,
  rawQuery: string,
  tokens: string[],
  locale: Locale,
  preferActive: boolean,
): number | null {
  const en = gem.name.en.toLowerCase();
  const zh = gem.name.zh.toLowerCase();
  const zhTw = (gem.name.zhTw ?? '').toLowerCase();
  const primary = localizeText(gem.name, locale).toLowerCase();
  const secondaries = [en, zh, zhTw].filter((s) => s && s !== primary);
  const tagsLower = gem.tags.map((tag) => tag.toLowerCase());

  if (tokens.length === 0) {
    // Unfiltered default order: optionally prioritize active skills first, then alphabetical/primary
    const catScore = preferActive ? (gem.category === 'active' ? 0 : 100) : gem.category === 'active' ? 0 : 10;
    return catScore;
  }

  // Every token must match name (ZH-CN / ZH-TW / EN) or tag (including Chinese tag alias)
  let tokenScore = 0;
  for (const tok of tokens) {
    const candidates = expandToken(tok);
    let bestTok = Infinity;
    for (const c of candidates) {
      if (primary === c) bestTok = Math.min(bestTok, 0);
      else if (secondaries.some((s) => s === c)) bestTok = Math.min(bestTok, 2);
      else if (primary.startsWith(c)) bestTok = Math.min(bestTok, 5);
      else if (secondaries.some((s) => s.startsWith(c))) bestTok = Math.min(bestTok, 8);
      else if (primary.includes(c)) bestTok = Math.min(bestTok, 15);
      else if (secondaries.some((s) => s.includes(c))) bestTok = Math.min(bestTok, 20);
      else if (tagsLower.some((t) => t === c)) bestTok = Math.min(bestTok, 30);
      else if (tagsLower.some((t) => t.includes(c))) bestTok = Math.min(bestTok, 40);
    }
    if (bestTok === Infinity) return null;
    tokenScore += bestTok;
  }

  // Bonus for matching the full query string directly
  if (primary === rawQuery || secondaries.some((s) => s === rawQuery)) tokenScore -= 50;
  else if (primary.startsWith(rawQuery) || secondaries.some((s) => s.startsWith(rawQuery))) tokenScore -= 20;
  else if (primary.includes(rawQuery) || secondaries.some((s) => s.includes(rawQuery))) tokenScore -= 8;

  // Mild tie-breaker favoring active skills when the group has no active gem yet
  if (preferActive && gem.category === 'active') tokenScore -= 3;
  return tokenScore;
}

export function searchGemsCatalog(
  gems: GemDefinition[],
  query: string,
  options: {
    category?: GemCategoryFilter;
    locale?: Locale;
    limit?: number;
    preferActive?: boolean;
  } = {},
): GemSearchResult {
  const { category = 'all', locale = 'zh-CN', limit = 80, preferActive = false } = options;
  const rawQuery = query.trim().toLowerCase();
  const tokens = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];

  const matched: Array<{ gem: GemDefinition; score: number }> = [];
  let totalActive = 0;
  let totalSupport = 0;

  for (const gem of gems) {
    const score = scoreGemMatch(gem, rawQuery, tokens, locale, preferActive);
    if (score === null) continue;
    if (gem.category === 'active') totalActive++;
    else totalSupport++;
    if (category === 'all' || gem.category === category) {
      matched.push({ gem, score });
    }
  }

  matched.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    const aName = localizeText(a.gem.name, locale);
    const bName = localizeText(b.gem.name, locale);
    return aName.localeCompare(bName, locale);
  });

  return {
    items: matched.slice(0, limit).map((m) => m.gem),
    totalMatched: matched.length,
    totalActive,
    totalSupport,
  };
}
