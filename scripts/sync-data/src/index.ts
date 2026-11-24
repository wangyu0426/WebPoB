import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLuaTable } from './luaParser.js';
import { parseTranslationCsv } from './csvParser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../..');
const PUBLIC_DATA_DIR = path.join(ROOT_DIR, 'apps/web/public/data');

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

async function fetchText(url: string): Promise<string> {
  console.log(`  ↓ Fetching ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'WebPoB-Sync/0.2 (+https://github.com/zhnpeng/WebPoB)' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  }
  return res.text();
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

function translateStatList(
  stats: string[] | undefined,
  statDict: Map<string, string>,
): string[] | undefined {
  if (!stats || stats.length === 0) return undefined;
  let anyTranslated = false;
  const out = stats.map((line) => {
    const direct = statDict.get(line);
    if (direct) {
      anyTranslated = true;
      return direct;
    }
    return line;
  });
  return anyTranslated ? out : undefined;
}

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

async function syncPoe1Tree(dnDict: Map<string, string>, sdDict: Map<string, string>): Promise<void> {
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

    const rawEn = String(node.name ?? `Node ${id}`);
    const startOverride = cs ? POE1_START_LABELS[cs] : undefined;
    const en = startOverride ? startOverride.en : rawEn;
    const zh = startOverride ? startOverride.zh : dnDict.get(rawEn);
    const stats = Array.isArray(node.stats)
      ? (node.stats as string[]).filter((s) => typeof s === 'string')
      : undefined;
    const statsZh = translateStatList(stats, sdDict);

    let me: CompactTreeNode['me'];
    if (Array.isArray(node.masteryEffects)) {
      me = (node.masteryEffects as Array<Record<string, unknown>>)
        .filter((e) => e && Array.isArray(e.stats))
        .map((e) => {
          const st = (e.stats as string[]).filter((s) => typeof s === 'string');
          return {
            id: Number(e.effect ?? 0),
            st,
            sz: translateStatList(st, sdDict),
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

async function syncPoe2Tree(dnDict: Map<string, string>, sdDict: Map<string, string>): Promise<void> {
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

    const rawEn = String(node.name ?? `Node ${id}`);
    const startOverride = k === 'S' ? POE2_START_LABELS[rawEn.toUpperCase()] : undefined;
    const en = startOverride ? startOverride.en : rawEn;
    const zh = startOverride ? startOverride.zh : dnDict.get(rawEn);
    const stats = Array.isArray(node.stats)
      ? (node.stats as string[]).filter((s) => typeof s === 'string')
      : undefined;
    const statsZh = translateStatList(stats, sdDict);
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
  zhDict: Map<string, string>,
  stepLabel: string,
): Promise<void> {
  console.log(`\n${stepLabel} Syncing official ${game.toUpperCase()} Gems catalog...`);
  const luaText = await fetchText(gemsUrl);
  const raw = parseLuaTable(luaText) as Record<string, Record<string, unknown>>;

  const seenNames = new Set<string>();
  const gems: CompactGemEntry[] = [];

  for (const [gameId, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== 'object') continue;
    const en = String(entry.name ?? '');
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

    const zh = zhDict.get(en) ?? zhDict.get(`${en} Support`);
    gems.push({
      id: `${game}_${String(entry.variantId ?? gameId).replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`,
      en,
      ...(zh ? { zh } : {}),
      cat: isSupport ? 'support' : 'active',
      color,
      tags,
    });
  }

  gems.sort((a, b) => a.en.localeCompare(b.en));
  const outPath = path.join(PUBLIC_DATA_DIR, `${game}-gems.json`);
  await fs.writeFile(outPath, JSON.stringify({ game, count: gems.length, gems }), 'utf-8');
  const translated = gems.filter((g) => Boolean(g.zh)).length;
  console.log(`  ✓ Wrote ${outPath}: ${gems.length} gems (${translated} ZH names)`);
}

async function main() {
  console.log('=== WebPoB Upstream Official Data & ZH Dictionary Sync ===');

  // Fetch bilingual dictionaries in parallel
  console.log('\nFetching bilingual Chinese dictionaries (PoeCharm / PoeCharm2 zh-rCN)...');
  const [
    poe1DnCsv,
    poe1SdCsv,
    poe1GemsCsv,
    poe2DnCsv,
    poe2SdCsv,
    poe2GemsCsv,
  ] = await Promise.all([
    fetchText('https://raw.githubusercontent.com/Chuanhsing/PoeCharm/master/Data/Translate/zh-rCN/tree_dn.csv'),
    fetchText('https://raw.githubusercontent.com/Chuanhsing/PoeCharm/master/Data/Translate/zh-rCN/tree_sd.csv'),
    fetchText('https://raw.githubusercontent.com/Chuanhsing/PoeCharm/master/Data/Translate/zh-rCN/Items_Gems.txt.csv'),
    fetchText('https://raw.githubusercontent.com/Chuanhsing/PoeCharm2/master/Data/Translate/zh-rCN/tree_dn.csv'),
    fetchText('https://raw.githubusercontent.com/Chuanhsing/PoeCharm2/master/Data/Translate/zh-rCN/tree_sd.csv'),
    fetchText('https://raw.githubusercontent.com/Chuanhsing/PoeCharm2/master/Data/Translate/zh-rCN/Items_Gems.txt.csv'),
  ]);

  const poe1Dn = parseTranslationCsv(poe1DnCsv);
  const poe1Sd = parseTranslationCsv(poe1SdCsv);
  const poe1GemDict = parseTranslationCsv(poe1GemsCsv);
  const poe2Dn = parseTranslationCsv(poe2DnCsv);
  const poe2Sd = parseTranslationCsv(poe2SdCsv);
  const poe2GemDict = parseTranslationCsv(poe2GemsCsv);

  console.log(
    `  ✓ Dictionaries loaded: PoE1 (${poe1Dn.size} node names, ${poe1Sd.size} stats, ${poe1GemDict.size} gems) | PoE2 (${poe2Dn.size} node names, ${poe2Sd.size} stats, ${poe2GemDict.size} gems)`,
  );

  await syncPoe1Tree(poe1Dn, poe1Sd);
  await syncPoe2Tree(poe2Dn, poe2Sd);
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
