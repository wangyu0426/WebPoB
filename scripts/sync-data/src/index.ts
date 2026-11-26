import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLuaTable } from './luaParser.js';
import {
  buildNameDictionary,
  createStatTranslator,
  normalizeLookupKey,
  parseTranslationCsvRows,
  type StatTranslator,
} from './csvParser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../..');
const PUBLIC_DATA_DIR = path.join(ROOT_DIR, 'apps/web/public/data');
const CACHE_DIR = path.join(ROOT_DIR, '.cache/poecharm');

// Classic PoE 1 non-uniform orbit angles (in degrees) for orbits with 16 or 40 slots
const POE1_ANGLES_16 = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
const POE1_ANGLES_40 = [
  0, 10, 20, 30, 40, 45, 50, 60, 70, 80,
  90, 100, 110, 120, 130, 135, 140, 150, 160, 170,
  180, 190, 200, 210, 220, 225, 230, 240, 250, 260,
  270, 280, 290, 300, 310, 315, 320, 330, 340, 350,
];

function getPoe1OrbitAngleRad(skillsInOrbit: number, orbitIndex: number): number {
  if (skillsInOrbit === 16) {
    return ((POE1_ANGLES_16[orbitIndex % 16] ?? 0) * Math.PI) / 180;
  }
  if (skillsInOrbit === 40) {
    return ((POE1_ANGLES_40[orbitIndex % 40] ?? 0) * Math.PI) / 180;
  }
  return (2 * Math.PI * orbitIndex) / Math.max(1, skillsInOrbit);
}

async function fetchText(url: string, cacheFile?: string): Promise<string> {
  if (cacheFile) {
    try {
      const cached = await fs.readFile(cacheFile, 'utf-8');
      if (cached.trim().length > 0) {
        return cached;
      }
    } catch {
      // cache miss; fall through to fetch
    }
  }
  console.log(`  ↓ Fetching ${url}`);
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'WebPoB-Sync/0.3 (+https://github.com/zhnpeng/WebPoB)' },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
      }
      const text = await res.text();
      if (cacheFile) {
        await fs.mkdir(path.dirname(cacheFile), { recursive: true });
        await fs.writeFile(cacheFile, text, 'utf-8');
      }
      return text;
    } catch (err) {
      lastErr = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw lastErr;
}

interface CompactTreeNode {
  id: number;
  en: string;
  zh?: string;
  k: 's' | 'n' | 'K' | 'M' | 'J' | 'S'; // small, notable, Keystone, Mastery, Jewel, Start
  x: number;
  y: number;
  g?: number; // group id
  o?: number; // orbit
  r?: number; // orbit radius
  a?: number; // angle (radians, 4 decimals)
  st?: string[]; // EN stats
  sz?: string[]; // ZH stats
  adj: number[]; // adjacent node ids
  cs?: string; // classStartId
  asc?: string; // ascendancyName
  me?: Array<{ id: number; st: string[]; sz?: string[] }>; // mastery effects
}

interface CompactTreePayload {
  game: 'poe1' | 'poe2';
  version: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  classStartNodeIds: Record<string, number>;
  groups: Record<number, { x: number; y: number }>;
  nodes: CompactTreeNode[];
}

interface NameDict {
  get: (en: string) => string | undefined;
  size: number;
}

// Official poedb.tw/cn & poe2db.tw/cn translations for newly added 3.30 / 0.5.4 nodes
// not yet mirrored into PoeCharm / PoeCharm2 tree_dn.csv
const POE1_POEDB_NODE_OVERRIDES: Record<string, string> = {
  'Box of Jewels': '珠宝箱',
  "The Draugur's Lantern": '尸鬼提灯',
  'Foulborn Tremor Rod': '秽生颤抖之杖',
};

const POE2_POE2DB_NODE_OVERRIDES: Record<string, string> = {
  'Rhythm of Ice': '冰霜韵律',
  Pyromancer: '火法师',
  'Ice Storm': '霜冻风暴',
  'Brain Freeze': '脑部冻结',
  'Rhythm of Fire': '火焰韵律',
  'Devotion to the King': '献身于王',
  Stormkeeper: '雷霆守护者',
  'Brain Storm': '头脑风暴',
  Flamekeeper: '火焰守护者',
  'Lightning Storm': '闪电风暴',
  'Life Leech, Armour and Evasion while Leeching': '生命偷取，偷取时护甲与闪避',
};

const POE2_SKILL_OVERRIDES: Record<string, string> = {
  "Queen's Procession": '女王仪仗',
  'Hollow Form': '空灵形态',
  'Hollow Resonance': '空灵共鸣',
  'Hollow Focus': '空灵专注',
  'Supporting Fire': '支援火力',
  'Time Snap': '时间快照',
  'Moment of Vulnerability': '破绽瞬间',
  'Mirage Deadeye': '幻影锐眼',
  'Encase in Jade': '翠玉封印',
  'Elemental Surge': '元素涌动',
  'Life Remnants': '生命残片',
  'Bleeding Concoction': '流血调合',
  'Shattering Concoction': '碎冰调合',
  "Navira's Fracturing": '纳维拉的碎裂',
  'Virtuous Barrier': '美德屏障',
  Meditate: '冥想',
  'Elemental Storm': '元素风暴',
  'Kelari, the Tainted Sands': '污秽之沙·凯拉里',
  "Ruzhan's Fury": '鲁赞之怒',
  'Summon Infernal Hound': '召唤炼狱猎犬',
  'Fire Spell on Hit': '击中触发火焰法术',
  'Primal Aegis': '原始神盾',
  'Summon Sentinel of Radiance': '召唤圣光哨卫',
  'Summon Elemental Relic': '召唤元素圣物',
  'Summon Triggerbots': '召唤触发机器人',
  Barkskin: '树皮术',
};

// Official poe2db.tw/cn stat-line fallbacks for the remaining 11 PoE 2 0.5 nodes
// whose strings are split across lines or newly revised after PoeCharm2 0.5.0
const POE2_STAT_OVERRIDES: Array<[string, string]> = [
  ['100 Passive Skill Points become Weapon Set Skill Points', '100 点天赋技能点转化为武器组天赋点'],
  ['{0}% increased Cast Speed per Spell Echoed Recently, up to {1}%', '近期内每次法术回响使施法速度提高 {0}%，最多提高 {1}%'],
  ['{0}% reduced Movement Speed Penalty from using Fire Skills while moving', '移动时使用火焰技能的移动速度惩罚降低 {0}%'],
  ['{0}% reduced Movement Speed Penalty from using Cold Skills while moving', '移动时使用冰霜技能的移动速度惩罚降低 {0}%'],
  ['Gain {0}% of Cold damage as Extra Lightning damage', '获得相当于冰霜伤害 {0}% 的额外闪电伤害'],
  ['Red: Hits against you have no Critical Damage Bonus', '红色：击中你的攻击没有暴击伤害加成'],
  ['Blue: Skills have {0}% less cost', '蓝色：技能消耗总降 {0}%'],
  ['Green: {0}% less Movement Speed Penalty from using Skills while Moving', '绿色：移动时使用技能的移动速度惩罚总降 {0}%'],
  ['{0}% chance for Enemies you Kill to Explode, dealing {1}% of their maximum Life as Physical Damage', '你击杀的敌人有 {0}% 几率爆炸，造成其最大生命 {1}% 的物理伤害'],
  ['{0}% chance for Enemies you Kill to Explode, dealing {1}%', '你击杀的敌人有 {0}% 几率爆炸，造成其生命上限 {1}% 的物理伤害'],
  ['1 Helmet socket', '1 个头盔插槽'],
  ['2 Body Armour sockets', '2 个胸甲插槽'],
  ['1 Gloves socket', '1 个手套插槽'],
  ['1 Boots socket', '1 个鞋子插槽'],
  ['cost {0}% less', '消耗总降 {0}%'],
  ['have {0}% less duration', '持续时间总降 {0}%'],
  ['Spells for which this Sacrifice was fully made deal {0}% more Damage', '完整完成该献祭的法术造成的伤害总增 {0}%'],
  ['Base Unarmed Physical damage replaced with damage based on their Skill Level', '基础徒手物理伤害替换为基于技能等级的伤害'],
  ['{0}% more Attack Speed per {1} Item Evasion on Equipped Armour Items', '已装备护甲物品上每有 {1} 点物品闪避值，攻击速度总增 {0}%'],
  ['+{0}% to Critical Hit Chance per {1} Item Energy Shield on Equipped Armour Items', '已装备护甲物品上每有 {1} 点物品能量护盾，暴击率 +{0}%'],
];

const POE1_CLASS_INDEX_TO_ID: Record<number, string> = {
  0: 'Scion',
  1: 'Marauder',
  2: 'Ranger',
  3: 'Witch',
  4: 'Duelist',
  5: 'Templar',
  6: 'Shadow',
};

const POE1_START_LABELS: Record<string, { en: string; zh: string }> = {
  Scion: { en: 'Scion', zh: '贵族' },
  Marauder: { en: 'Marauder', zh: '野蛮人' },
  Ranger: { en: 'Ranger', zh: '游侠' },
  Witch: { en: 'Witch', zh: '女巫' },
  Duelist: { en: 'Duelist', zh: '决斗者' },
  Templar: { en: 'Templar', zh: '圣堂武僧' },
  Shadow: { en: 'Shadow', zh: '暗影刺客' },
};

const POE2_START_LABELS: Record<string, { en: string; zh: string }> = {
  WITCH: { en: 'Sorceress / Witch', zh: '魔巫 / 女巫' },
  SIX: { en: 'Monk', zh: '武僧' },
  RANGER: { en: 'Ranger / Huntress', zh: '游侠 / 女猎手' },
  DUELIST: { en: 'Mercenary', zh: '佣兵' },
  MARAUDER: { en: 'Warrior', zh: '战士' },
  TEMPLAR: { en: 'Druid', zh: '德鲁伊' },
};

async function syncPoe1Tree(dnDict: NameDict, statTranslator: StatTranslator): Promise<void> {
  console.log('\n[1/4] Syncing official PoE 1 Passive Tree (3_30)...');
  const luaText = await fetchText(
    'https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding/master/src/TreeData/3_30/tree.lua',
  );
  const raw = parseLuaTable(luaText) as Record<string, unknown>;
  const constants = (raw.constants ?? {}) as Record<string, unknown>;
  const orbitRadii = (constants.orbitRadii ?? [0, 82, 162, 335, 493, 662, 846]) as number[];
  const skillsPerOrbit = (constants.skillsPerOrbit ?? [1, 6, 16, 16, 40, 72, 72]) as number[];

  const rawGroups = (raw.groups ?? {}) as Record<string, Record<string, unknown>>;
  const rawNodes = (raw.nodes ?? {}) as Record<string, Record<string, unknown>>;

  const groups: Record<number, { x: number; y: number }> = {};
  const nodeMap = new Map<number, CompactTreeNode>();
  const classStartNodeIds: Record<string, number> = {};

  for (const [key, node] of Object.entries(rawNodes)) {
    if (key === 'root' || !node || typeof node !== 'object') continue;
    if (node.isProxy || node.isBlighted || node.isBloodline) continue;

    const id = Number(node.skill ?? key);
    if (!Number.isFinite(id) || id <= 0) continue;

    const groupId = Number(node.group);
    const groupObj = rawGroups[String(groupId)];
    if (!groupObj) continue;

    const gx = Number(groupObj.x ?? 0);
    const gy = Number(groupObj.y ?? 0);
    groups[groupId] = { x: Math.round(gx), y: Math.round(gy) };

    const orbit = Number(node.orbit ?? 0);
    const orbitIndex = Number(node.orbitIndex ?? 0);
    const radius = orbitRadii[orbit] ?? 0;
    const angle = getPoe1OrbitAngleRad(skillsPerOrbit[orbit] ?? 1, orbitIndex);

    const x = Math.round(gx + radius * Math.sin(angle));
    const y = Math.round(gy - radius * Math.cos(angle));

    let k: CompactTreeNode['k'] = 's';
    let cs: string | undefined;
    if (node.classStartIndex !== undefined && node.classStartIndex !== null) {
      k = 'S';
      cs = POE1_CLASS_INDEX_TO_ID[Number(node.classStartIndex)];
      if (cs) classStartNodeIds[cs] = id;
    } else if (node.isKeystone) {
      k = 'K';
    } else if (node.isMastery) {
      k = 'M';
    } else if (node.isJewelSocket) {
      k = 'J';
    } else if (node.isNotable) {
      k = 'n';
    }

    const rawEn = String(node.name ?? `Node ${id}`).trim();
    const startOverride = cs ? POE1_START_LABELS[cs] : undefined;
    const en = startOverride ? startOverride.en : rawEn;
    const zh = startOverride ? startOverride.zh : dnDict.get(rawEn);
    const stats = Array.isArray(node.stats)
      ? (node.stats as string[]).filter((s) => typeof s === 'string')
      : undefined;
    const statsZh = statTranslator.translateStatList(stats);

    let me: CompactTreeNode['me'];
    if (Array.isArray(node.masteryEffects)) {
      me = (node.masteryEffects as Array<Record<string, unknown>>)
        .filter((e) => e && Array.isArray(e.stats))
        .map((e) => {
          const st = (e.stats as string[]).filter((s) => typeof s === 'string');
          return {
            id: Number(e.effect ?? 0),
            st,
            sz: statTranslator.translateStatList(st),
          };
        });
    }

    const asc = typeof node.ascendancyName === 'string' ? node.ascendancyName : undefined;

    nodeMap.set(id, {
      id,
      en,
      ...(zh ? { zh } : {}),
      k,
      x,
      y,
      g: groupId,
      o: orbit,
      ...(radius > 0 ? { r: radius, a: Math.round(angle * 10000) / 10000 } : {}),
      ...(stats && stats.length > 0 ? { st: stats } : {}),
      ...(statsZh ? { sz: statsZh } : {}),
      adj: [],
      ...(cs ? { cs } : {}),
      ...(asc ? { asc } : {}),
      ...(me && me.length > 0 ? { me } : {}),
    });
  }

  // Build clean undirected adjacency (excluding cluster proxy / cross-ascendancy jumps to main root)
  for (const [key, node] of Object.entries(rawNodes)) {
    if (key === 'root' || !node) continue;
    const id = Number(node.skill ?? key);
    const self = nodeMap.get(id);
    if (!self) continue;

    const outs = Array.isArray(node.out) ? (node.out as Array<string | number>) : [];
    for (const rawTarget of outs) {
      const targetId = Number(rawTarget);
      const target = nodeMap.get(targetId);
      if (!target || targetId === id) continue;
      // Don't connect mastery icons to travel graph directly if PoE marks them non-traversable
      if (self.k === 'M' || target.k === 'M') continue;
      // Keep ascendancy trees separate from main tree except via ascendancy start
      if (Boolean(self.asc) !== Boolean(target.asc)) continue;

      if (!self.adj.includes(targetId)) self.adj.push(targetId);
      if (!target.adj.includes(id)) target.adj.push(id);
    }
  }

  // Filter out orphan proxy/unconnected nodes (except class starts and masteries)
  const nodes = [...nodeMap.values()].filter(
    (n) => n.adj.length > 0 || n.k === 'S' || n.k === 'M',
  );

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }

  const payload: CompactTreePayload = {
    game: 'poe1',
    version: '3_30',
    bounds: { minX, maxX, minY, maxY },
    classStartNodeIds,
    groups,
    nodes,
  };

  await fs.mkdir(PUBLIC_DATA_DIR, { recursive: true });
  const outPath = path.join(PUBLIC_DATA_DIR, 'poe1-tree-3_30.json');
  await fs.writeFile(outPath, JSON.stringify(payload), 'utf-8');
  const translatedNames = nodes.filter((n) => Boolean(n.zh)).length;
  console.log(
    `  ✓ Wrote ${outPath}: ${nodes.length} nodes (${translatedNames} ZH names), classStarts: ${JSON.stringify(classStartNodeIds)}`,
  );
}

async function syncPoe2Tree(dnDict: NameDict, statTranslator: StatTranslator): Promise<void> {
  console.log('\n[2/4] Syncing official PoE 2 Passive Tree (0_5)...');
  const jsonText = await fetchText(
    'https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/dev/src/TreeData/0_5/tree.json',
  );
  const raw = JSON.parse(jsonText) as Record<string, unknown>;
  const constants = (raw.constants ?? {}) as Record<string, unknown>;
  const orbitRadii = (constants.orbitRadii ?? [0, 82, 162, 335, 493, 662, 846, 251, 1080, 1322]) as number[];
  const orbitAngles = (constants.orbitAnglesByOrbit ?? []) as number[][];
  const skillsPerOrbit = (constants.skillsPerOrbit ?? [1, 12, 24, 24, 72, 72, 72, 24, 72, 144]) as number[];

  const rawGroups = raw.groups as Array<Record<string, unknown>> | Record<string, Record<string, unknown>>;
  const rawNodes = (raw.nodes ?? {}) as Record<string, Record<string, unknown>>;

  const groups: Record<number, { x: number; y: number }> = {};
  const nodeMap = new Map<number, CompactTreeNode>();
  const classStartNodeIds: Record<string, number> = {};

  for (const [key, node] of Object.entries(rawNodes)) {
    if (key === 'root' || !node || typeof node !== 'object') continue;
    if (node.isProxy || node.isOnlyImage) continue;

    const id = Number(node.skill ?? key);
    if (!Number.isFinite(id) || id <= 0) continue;

    const groupId = Number(node.group);
    // PoE 2 tree.json serializes Lua's 1-indexed groups table as a 0-indexed JSON array!
    const groupObj = Array.isArray(rawGroups)
      ? rawGroups[groupId - 1]
      : rawGroups?.[String(groupId)];
    if (!groupObj) continue;

    const gx = Number(groupObj.x ?? 0);
    const gy = Number(groupObj.y ?? 0);
    groups[groupId] = { x: Math.round(gx), y: Math.round(gy) };

    const orbit = Number(node.orbit ?? 0);
    const orbitIndex = Number(node.orbitIndex ?? 0);
    const radius = orbitRadii[orbit] ?? 0;
    const angle =
      orbitAngles[orbit]?.[orbitIndex] ??
      (2 * Math.PI * orbitIndex) / Math.max(1, skillsPerOrbit[orbit] ?? 1);

    const x = Math.round(gx + radius * Math.sin(angle));
    const y = Math.round(gy - radius * Math.cos(angle));

    let k: CompactTreeNode['k'] = 's';
    let cs: string | undefined;
    if (Array.isArray(node.classesStart) && node.classesStart.length > 0) {
      k = 'S';
      const starts = node.classesStart as string[];
      cs = starts[0];
      for (const clsName of starts) {
        classStartNodeIds[clsName] = id;
      }
    } else if (node.isKeystone) {
      k = 'K';
    } else if (node.isJewelSocket) {
      k = 'J';
    } else if (node.isNotable) {
      k = 'n';
    }

    const rawEn = String(node.name ?? `Node ${id}`).trim();
    const startOverride = k === 'S' ? POE2_START_LABELS[rawEn.toUpperCase()] : undefined;
    const en = startOverride ? startOverride.en : rawEn;
    const zh = startOverride ? startOverride.zh : dnDict.get(rawEn);
    const stats = Array.isArray(node.stats)
      ? (node.stats as string[]).filter((s) => typeof s === 'string')
      : undefined;
    const statsZh = statTranslator.translateStatList(stats);
    const asc = typeof node.ascendancyName === 'string' ? node.ascendancyName : undefined;

    nodeMap.set(id, {
      id,
      en,
      ...(zh ? { zh } : {}),
      k,
      x,
      y,
      g: groupId,
      o: orbit,
      ...(radius > 0 ? { r: radius, a: Math.round(angle * 10000) / 10000 } : {}),
      ...(stats && stats.length > 0 ? { st: stats } : {}),
      ...(statsZh ? { sz: statsZh } : {}),
      adj: [],
      ...(cs ? { cs } : {}),
      ...(asc ? { asc } : {}),
    });
  }

  // PoE 2 uses `connections: [{ id: number, orbit: number }]`
  for (const [key, node] of Object.entries(rawNodes)) {
    if (key === 'root' || !node) continue;
    const id = Number(node.skill ?? key);
    const self = nodeMap.get(id);
    if (!self) continue;

    const conns = Array.isArray(node.connections)
      ? (node.connections as Array<{ id: number } | number>)
      : [];
    for (const c of conns) {
      const targetId = typeof c === 'number' ? c : Number(c?.id);
      const target = nodeMap.get(targetId);
      if (!target || targetId === id) continue;
      if (Boolean(self.asc) !== Boolean(target.asc)) continue;

      if (!self.adj.includes(targetId)) self.adj.push(targetId);
      if (!target.adj.includes(id)) target.adj.push(id);
    }
  }

  const nodes = [...nodeMap.values()].filter((n) => n.adj.length > 0 || n.k === 'S');

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }

  const payload: CompactTreePayload = {
    game: 'poe2',
    version: '0_5',
    bounds: { minX, maxX, minY, maxY },
    classStartNodeIds,
    groups,
    nodes,
  };

  const outPath = path.join(PUBLIC_DATA_DIR, 'poe2-tree-0_5.json');
  await fs.writeFile(outPath, JSON.stringify(payload), 'utf-8');
  const translatedNames = nodes.filter((n) => Boolean(n.zh)).length;
  console.log(
    `  ✓ Wrote ${outPath}: ${nodes.length} nodes (${translatedNames} ZH names), classStarts: ${JSON.stringify(classStartNodeIds)}`,
  );
}

interface CompactGemEntry {
  id: string;
  en: string;
  zh?: string;
  cat: 'active' | 'support';
  color: 'red' | 'green' | 'blue' | 'white';
  tags: string[];
}

async function syncGems(
  game: 'poe1' | 'poe2',
  gemsUrl: string,
  zhDict: NameDict,
  stepLabel: string,
): Promise<void> {
  console.log(`\n${stepLabel} Syncing official ${game.toUpperCase()} Gems catalog...`);
  const outPath = path.join(PUBLIC_DATA_DIR, `${game}-gems.json`);

  // Preserve any Lua-exported Lv.1-30 skill scaling fields already present in poeX-gems.json
  const existingByKey = new Map<string, Record<string, unknown>>();
  try {
    const existingRaw = JSON.parse(await fs.readFile(outPath, 'utf-8')) as {
      gems?: Array<Record<string, unknown>>;
    };
    for (const g of existingRaw.gems ?? []) {
      if (typeof g.en === 'string') {
        existingByKey.set(normalizeLookupKey(g.en), g);
      }
    }
  } catch {
    // fresh generation
  }

  const luaText = await fetchText(gemsUrl);
  const raw = parseLuaTable(luaText) as Record<string, Record<string, unknown>>;

  const seenNames = new Set<string>();
  const gems: Array<Record<string, unknown>> = [];

  for (const [gameId, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== 'object') continue;
    const en = String(entry.name ?? '').trim();
    if (!en || seenNames.has(en)) continue;
    // Skip Vaal/Trarthus/Royale internal duplicates where name is empty or test
    if (/^\[|Royale|Test/i.test(en)) continue;
    seenNames.add(en);

    const tagsObj = (entry.tags ?? {}) as Record<string, boolean>;
    const tags = Object.keys(tagsObj).filter((k) => tagsObj[k]);
    const isSupport = Boolean(tagsObj.support || /support/i.test(en));

    let color: CompactGemEntry['color'] = 'white';
    const reqStr = Number(entry.reqStr ?? 0);
    const reqDex = Number(entry.reqDex ?? 0);
    const reqInt = Number(entry.reqInt ?? 0);
    if (tagsObj.strength || (reqStr >= reqDex && reqStr >= reqInt && reqStr > 0)) color = 'red';
    else if (tagsObj.dexterity || (reqDex >= reqStr && reqDex >= reqInt && reqDex > 0)) color = 'green';
    else if (tagsObj.intelligence || reqInt > 0) color = 'blue';

    const zh =
      zhDict.get(en) ??
      zhDict.get(`${en} Support`) ??
      zhDict.get(en.replace(/\s+Support$/i, ''));

    const prev = existingByKey.get(normalizeLookupKey(en));
    const merged: Record<string, unknown> = {
      ...(prev ?? {}),
      id: `${game}_${String(entry.variantId ?? gameId).replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`,
      en,
      ...(zh ? { zh } : {}),
      cat: isSupport ? 'support' : 'active',
      color,
      tags,
    };
    if (!zh && 'zh' in merged && typeof merged.zh === 'string' && !/[\u4e00-\u9fff]/.test(merged.zh)) {
      delete merged.zh;
    }
    gems.push(merged);
  }

  gems.sort((a, b) => String(a.en).localeCompare(String(b.en)));
  await fs.writeFile(outPath, JSON.stringify({ game, count: gems.length, gems }), 'utf-8');
  const translated = gems.filter((g) => typeof g.zh === 'string' && /[\u4e00-\u9fff]/.test(g.zh)).length;
  console.log(`  ✓ Wrote ${outPath}: ${gems.length} gems (${translated} ZH names)`);
}

async function fetchPoeCharmRows(repo: 'PoeCharm' | 'PoeCharm2', file: string): Promise<Array<[string, string]>> {
  const sub = repo === 'PoeCharm' ? 'p1' : 'p2';
  const cacheFile = path.join(CACHE_DIR, sub, file);
  const url = `https://raw.githubusercontent.com/Chuanhsing/${repo}/main/Data/Translate/zh-rCN/${file}`;
  const text = await fetchText(url, cacheFile);
  return parseTranslationCsvRows(text);
}

async function main() {
  console.log('=== WebPoB Upstream Official Data & ZH Dictionary Sync (poedb.tw / PoeCharm) ===');

  // Fetch full PoeCharm / PoeCharm2 zh-rCN dictionaries (cached in .cache/poecharm)
  console.log('\nLoading bilingual Chinese dictionaries (PoeCharm / PoeCharm2 zh-rCN)...');
  const p1Files = [
    'tree_dn.csv',
    'tree_sd.csv',
    'statDescriptions.csv',
    'passiveTree.csv',
    'Uniques.txt.csv',
    'Items_Gems.txt.csv',
    'Gems_data.txt.csv',
  ] as const;

  const p1Rows: Record<string, Array<[string, string]>> = {};
  const p2Rows: Record<string, Array<[string, string]>> = {};
  for (const file of p1Files) {
    p1Rows[file] = await fetchPoeCharmRows('PoeCharm', file);
    p2Rows[file] = await fetchPoeCharmRows('PoeCharm2', file);
  }

  const poe1GemDict = buildNameDictionary(
    [p1Rows['Items_Gems.txt.csv']!, p1Rows['Gems_data.txt.csv']!],
    POE2_SKILL_OVERRIDES,
  );
  const poe2GemDict = buildNameDictionary(
    [p2Rows['Items_Gems.txt.csv']!, p2Rows['Gems_data.txt.csv']!, p1Rows['Items_Gems.txt.csv']!],
    POE2_SKILL_OVERRIDES,
  );

  const poe1Dn = buildNameDictionary(
    [p1Rows['tree_dn.csv']!, p1Rows['Uniques.txt.csv']!, p1Rows['statDescriptions.csv']!],
    POE1_POEDB_NODE_OVERRIDES,
  );
  const poe2Dn = buildNameDictionary(
    [
      p2Rows['tree_dn.csv']!,
      p1Rows['tree_dn.csv']!,
      p2Rows['Uniques.txt.csv']!,
      p2Rows['statDescriptions.csv']!,
    ],
    POE2_POE2DB_NODE_OVERRIDES,
  );

  const poe1StatTranslator = createStatTranslator(
    [p1Rows['tree_sd.csv']!, p1Rows['passiveTree.csv']!, p1Rows['statDescriptions.csv']!],
    poe1GemDict,
  );
  const poe2StatTranslator = createStatTranslator(
    [
      POE2_STAT_OVERRIDES,
      p2Rows['tree_sd.csv']!,
      p2Rows['passiveTree.csv']!,
      p2Rows['statDescriptions.csv']!,
      p1Rows['tree_sd.csv']!,
      p1Rows['statDescriptions.csv']!,
    ],
    poe2GemDict,
  );

  console.log(
    `  ✓ Dictionaries loaded: PoE1 (${poe1Dn.size} names, ${poe1StatTranslator.exactCount} exact / ${poe1StatTranslator.templateCount} tpl stats, ${poe1GemDict.size} gems) | PoE2 (${poe2Dn.size} names, ${poe2StatTranslator.exactCount} exact / ${poe2StatTranslator.templateCount} tpl stats, ${poe2GemDict.size} gems)`,
  );

  await syncPoe1Tree(poe1Dn, poe1StatTranslator);
  await syncPoe2Tree(poe2Dn, poe2StatTranslator);
  await syncGems(
    'poe1',
    'https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding/master/src/Data/Gems.lua',
    poe1GemDict,
    '[3/4]',
  );
  await syncGems(
    'poe2',
    'https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/dev/src/Data/Gems.lua',
    poe2GemDict,
    '[4/4]',
  );

  console.log('\n=== Sync complete! ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
