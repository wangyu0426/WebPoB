/**
 * Utilities for parsing PoeCharm / PoeCharm2 (poedb.tw / poe2db.tw) zh-rCN CSV dictionaries
 * and matching PoE 1 / PoE 2 passive tree & skill stat descriptions cleanly.
 */

const CJK_RE = /[\u4e00-\u9fff]/;

/**
 * Strips PoE 2 rich-text link markup:
 * - `[Critical|Critical Hit Chance]` -> `Critical Hit Chance`
 * - `[Poison|中毒]` -> `中毒`
 * - `[Poison]` -> `Poison`
 */
export function stripPoeMarkup(input: string): string {
  return input
    .replace(/\[[^\]|]+\|([^\]]+)\]/g, '$1')
    .replace(/\[([^\]]+)\]/g, '$1');
}

/**
 * Normalizes a lookup key by stripping markup, diacritics (e.g. Mórrigan -> morrigan),
 * collapsing whitespace, and lowercasing.
 */
export function normalizeLookupKey(input: string): string {
  return stripPoeMarkup(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Parses a PoeCharm-style 2-column CSV into `[en, zh]` pairs with `\n` properly unescaped.
 */
export function parseTranslationCsvRows(csvText: string): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  const lines = csvText.replace(/\r\n/g, '\n').split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cols.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current);

    const en = cols[0]?.replace(/\\r/g, '').replace(/\\n/g, '\n').trim();
    const zh = cols[1]?.replace(/\\r/g, '').replace(/\\n/g, '\n').trim();
    if (en && zh && en !== zh) {
      rows.push([en, zh]);
    }
  }

  return rows;
}

/**
 * Parses PoeCharm-style 2-column CSV translation tables (`"English","中文"` or `English,中文`)
 * into a `Map<string, string>` with markup-stripped Chinese values and unescaped newlines.
 */
export function parseTranslationCsv(csvText: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const [rawEn, rawZh] of parseTranslationCsvRows(csvText)) {
    const cleanZh = stripPoeMarkup(rawZh).trim();
    if (!cleanZh) continue;
    if (!map.has(rawEn)) map.set(rawEn, cleanZh);
    const cleanEn = stripPoeMarkup(rawEn).trim();
    if (cleanEn && !map.has(cleanEn)) map.set(cleanEn, cleanZh);
  }
  return map;
}

/**
 * Builds a case- and diacritic-insensitive name lookup map from multiple ordered CSV row sets.
 * Earlier row sets take precedence over later fallback sets.
 */
export function buildNameDictionary(
  rowSets: Array<Array<[string, string]>>,
  overrides?: Record<string, string>,
): { get: (en: string) => string | undefined; size: number } {
  const exact = new Map<string, string>();
  const normalized = new Map<string, string>();

  const register = (rawEn: string, rawZh: string) => {
    const cleanEn = stripPoeMarkup(rawEn).trim();
    const cleanZh = stripPoeMarkup(rawZh).trim();
    if (!cleanEn || !cleanZh || !CJK_RE.test(cleanZh)) return;
    if (!exact.has(cleanEn)) exact.set(cleanEn, cleanZh);
    const norm = normalizeLookupKey(cleanEn);
    if (norm && !normalized.has(norm)) normalized.set(norm, cleanZh);
  };

  for (const rows of rowSets) {
    for (const [en, zh] of rows) register(en, zh);
  }
  if (overrides) {
    for (const [en, zh] of Object.entries(overrides)) register(en, zh);
  }

  return {
    size: normalized.size,
    get(en: string): string | undefined {
      const trimmed = stripPoeMarkup(en).trim();
      if (!trimmed) return undefined;
      return exact.get(trimmed) ?? normalized.get(normalizeLookupKey(trimmed));
    },
  };
}

function toNumericTemplate(str: string, absorbSign: boolean): { tpl: string; nums: string[] } {
  const nums: string[] = [];
  const re = absorbSign ? /[+-]?\d+(?:\.\d+)?/g : /\d+(?:\.\d+)?/g;
  const tpl = str.replace(re, (match) => {
    nums.push(match);
    return `{${nums.length - 1}}`;
  });
  return { tpl, nums };
}

export interface StatTranslator {
  translateLine: (line: string) => string | undefined;
  translateStatList: (stats: string[] | undefined) => string[] | undefined;
  exactCount: number;
  templateCount: number;
}

/**
 * Builds a comprehensive stat-line translator backed by PoeCharm / poedb.tw CSV tables
 * (`tree_sd.csv`, `passiveTree.csv`, `statDescriptions.csv`), supporting:
 * - exact & case-insensitive lookup (with PoE 2 `[Key|Display]` markup stripped)
 * - `{0}` / `{1}` / `{2}` numeric placeholder templates (both pre-templatized and auto-templatized)
 * - `Grants N Passive Skill Point(s)`, `Grants Skill: X`, and `Grants Level N X`
 * - multi-line `\n` split translation
 * - consecutive-line sentence merge (for PoE 2 lines wrapped across two `stats[]` entries)
 */
export function createStatTranslator(
  rowSets: Array<Array<[string, string]>>,
  skillNameDict?: { get: (en: string) => string | undefined },
): StatTranslator {
  const exact = new Map<string, string>();
  const exactLower = new Map<string, string>();
  const templates = new Map<string, string>();
  const templatesNoSign = new Map<string, string>();

  const registerPair = (rawEn: string, rawZh: string) => {
    const en = stripPoeMarkup(rawEn).trim();
    const zh = stripPoeMarkup(rawZh).trim();
    if (!en || !zh || !CJK_RE.test(zh)) return;

    if (!exact.has(en)) exact.set(en, zh);
    const low = en.toLowerCase();
    if (!exactLower.has(low)) exactLower.set(low, zh);

    if (/\{\d+\}/.test(en)) {
      if (!templates.has(low)) templates.set(low, zh);
      const normNoSign = low.replace(/[+-](\{\d+\})/g, '$1');
      if (!templatesNoSign.has(normNoSign)) templatesNoSign.set(normNoSign, zh);
      return;
    }

    // Auto-templatize concrete stat lines (e.g. from tree_sd.csv) when numbers align 1-to-1
    const enNums = en.match(/\d+(?:\.\d+)?/g);
    if (enNums && enNums.length > 0 && enNums.length <= 3) {
      let zhTpl = zh;
      let ok = true;
      for (let i = 0; i < enNums.length; i++) {
        const n = enNums[i]!;
        const re = new RegExp(`(?<!\\d)${n.replace('.', '\\.')}(?!\\d)`);
        if (re.test(zhTpl)) {
          zhTpl = zhTpl.replace(re, `{${i}}`);
        } else {
          ok = false;
          break;
        }
      }
      if (ok) {
        const { tpl } = toNumericTemplate(en, false);
        const norm = tpl.toLowerCase();
        if (!templates.has(norm)) templates.set(norm, zhTpl);
        const normNoSign = norm.replace(/[+-](\{\d+\})/g, '$1');
        if (!templatesNoSign.has(normNoSign)) templatesNoSign.set(normNoSign, zhTpl);
      }
    }
  };

  for (const rows of rowSets) {
    for (const [en, zh] of rows) registerPair(en, zh);
  }

  const translateSingle = (line: string): string | undefined => {
    const clean = stripPoeMarkup(line).trim();
    if (!clean) return undefined;

    const hit = exact.get(clean) ?? exactLower.get(clean.toLowerCase());
    if (hit) return hit;

    // Common passive tree structural lines often omitted from statDescriptions.csv
    const mPts = clean.match(/^Grants (\d+) Passive Skill Points?$/i);
    if (mPts) return `获得 ${mPts[1]} 点天赋技能点`;

    const mGrantsSkill = clean.match(/^Grants Skill:\s*(.+)$/i);
    if (mGrantsSkill) {
      const skillEn = mGrantsSkill[1]!.trim();
      const skillZh = skillNameDict?.get(skillEn);
      return `获得技能：${skillZh ?? skillEn}`;
    }

    const mGrantsLevel = clean.match(/^Grants Level (\d+)\s+(.+?)(?:\s+Skill)?$/i);
    if (mGrantsLevel) {
      const lv = mGrantsLevel[1]!;
      const skillEn = mGrantsLevel[2]!.trim();
      const skillZh = skillNameDict?.get(skillEn);
      if (skillZh) return `获得 ${lv} 级${skillZh}技能`;
    }

    // 1) Sign-preserved numeric template lookup
    const t1 = toNumericTemplate(clean, false);
    const z1 = templates.get(t1.tpl.toLowerCase());
    if (z1) {
      return z1.replace(/\{(\d+)\}/g, (_, idx) => t1.nums[Number(idx)] ?? '');
    }

    // 2) Sign-absorbed numeric template lookup
    const t2 = toNumericTemplate(clean, true);
    const z2 = templatesNoSign.get(t2.tpl.toLowerCase());
    if (z2) {
      return z2.replace(/([+-]?)\{(\d+)\}/g, (_, sign: string, idx: string) => {
        const val = t2.nums[Number(idx)] ?? '';
        if (sign && (val.startsWith('+') || val.startsWith('-'))) return val;
        return sign + val;
      });
    }

    return undefined;
  };

  const translateLine = (line: string): string | undefined => {
    const direct = translateSingle(line);
    if (direct) return direct;

    if (line.includes('\n')) {
      // Try joining wrapped lines with a single space first
      const joinedSpace = translateSingle(line.replace(/\s*\n\s*/g, ' '));
      if (joinedSpace) return joinedSpace;

      const parts = line.split('\n');
      let any = false;
      const out = parts.map((part) => {
        const tr = translateSingle(part);
        if (tr) {
          any = true;
          return tr;
        }
        return part;
      });
      if (any) return out.join('\n');
    }

    return undefined;
  };

  const translateStatList = (stats: string[] | undefined): string[] | undefined => {
    if (!stats || stats.length === 0) return undefined;
    let anyTranslated = false;
    const out: string[] = [];

    for (let i = 0; i < stats.length; i++) {
      const line = stats[i]!;
      const direct = translateLine(line);
      if (direct) {
        anyTranslated = true;
        out.push(direct);
        continue;
      }

      // PoE 2 tree.json sometimes splits one sentence across two adjacent stat entries
      if (i + 1 < stats.length) {
        const nextLine = stats[i + 1]!;
        const merged =
          translateSingle(`${line.trim()} ${nextLine.trim()}`) ??
          translateSingle(`${line}\n${nextLine}`);
        if (merged) {
          anyTranslated = true;
          out.push(merged);
          i++; // consume merged next line
          continue;
        }
      }

      out.push(line);
    }

    return anyTranslated ? out : undefined;
  };

  return {
    translateLine,
    translateStatList,
    exactCount: exact.size,
    templateCount: templates.size,
  };
}
