import type {
  Build,
  EquipmentSlotId,
  GameId,
  GemInstance,
  Item,
  ItemRarity,
  SkillGroup,
} from '@webpob/core';
import {
  createDefaultConfig,
  getBaseItemStats,
  getClassesForGame,
  getGemsForGame,
  getTreeForGame,
} from '@webpob/data';

export interface GggCharacterPayload {
  name?: string;
  class?: string;
  level?: number;
  league?: string;
}

export interface GggRawItem {
  id?: string;
  name?: string;
  typeLine?: string;
  baseType?: string;
  inventoryId?: string;
  frameType?: number;
  x?: number;
  ilvl?: number;
  implicitMods?: string[];
  explicitMods?: string[];
  craftedMods?: string[];
  enchantMods?: string[];
  fracturedMods?: string[];
  properties?: Array<{ name?: string; values?: Array<[string, number]> }>;
  socketedItems?: Array<{
    baseType?: string;
    typeLine?: string;
    support?: boolean;
    properties?: Array<{ name?: string; values?: Array<[string, number]> }>;
  }>;
}

export interface GggPassiveSkillsResponse {
  hashes?: number[];
  hashes_ex?: number[];
  mastery_effects?: Record<string, number>;
  items?: GggRawItem[];
  jewel_data?: Record<string, unknown>;
}

export interface GggItemsResponse {
  character?: GggCharacterPayload;
  items?: GggRawItem[];
}

const INVENTORY_TO_SLOT: Record<string, EquipmentSlotId> = {
  Weapon: 'Weapon 1',
  Offhand: 'Weapon 2',
  Weapon2: 'Weapon 1 Swap',
  Offhand2: 'Weapon 2 Swap',
  Helm: 'Helmet',
  BodyArmour: 'Body Armour',
  Gloves: 'Gloves',
  Boots: 'Boots',
  Amulet: 'Amulet',
  Ring: 'Ring 1',
  Ring2: 'Ring 2',
  Belt: 'Belt',
};

function mapFrameTypeToRarity(frameType?: number): ItemRarity {
  switch (frameType) {
    case 1:
      return 'MAGIC';
    case 2:
      return 'RARE';
    case 3:
      return 'UNIQUE';
    default:
      return 'NORMAL';
  }
}

function extractNumericProp(
  props: GggRawItem['properties'] | undefined,
  propName: string,
  fallback = 0,
): number {
  if (!props) return fallback;
  const found = props.find((p) => p.name?.toLowerCase() === propName.toLowerCase());
  const raw = found?.values?.[0]?.[0];
  if (!raw) return fallback;
  const m = raw.match(/(\d+)/);
  return m ? Number(m[1]) : fallback;
}

function cleanGggName(str?: string): string {
  return (str ?? '').replace(/<<[^>]+>>/g, '').trim();
}

function resolveSlot(raw: GggRawItem): EquipmentSlotId | undefined {
  const inv = raw.inventoryId;
  if (!inv) return undefined;
  if (inv === 'Flask' && typeof raw.x === 'number' && raw.x >= 0 && raw.x < 5) {
    return `Flask ${raw.x + 1}` as EquipmentSlotId;
  }
  return INVENTORY_TO_SLOT[inv];
}

function convertRawItem(raw: GggRawItem, game: GameId, idx: number): { item: Item; slot?: EquipmentSlotId } {
  const baseName = cleanGggName(raw.baseType || raw.typeLine) || 'Unknown Base';
  const name = cleanGggName(raw.name) || baseName;
  const quality = extractNumericProp(raw.properties, 'Quality', 0);
  const slot = resolveSlot(raw);
  const baseStats = getBaseItemStats(baseName, 0, game);

  const implicits = [
    ...(raw.enchantMods ?? []),
    ...(raw.implicitMods ?? []),
  ].filter(Boolean);
  const explicits = [
    ...(raw.fracturedMods ?? []),
    ...(raw.explicitMods ?? []),
    ...(raw.craftedMods ?? []),
  ].filter(Boolean);

  const item: Item = {
    id: raw.id ? `ggg_${raw.id.slice(0, 12)}` : `ggg_item_${idx}_${Date.now()}`,
    name,
    baseName,
    rarity: mapFrameTypeToRarity(raw.frameType),
    slotType: slot ?? 'Any',
    quality,
    weaponStats: baseStats?.weapon,
    armourStats: baseStats?.armour,
    implicits,
    explicits,
    localStatsPrecomputed: false,
  };
  return { item, slot };
}

/**
 * Parses official GGG / Tencent CN `get-passive-skills` and/or `get-items` JSON payloads
 * into a complete WebPoB `Build` without requiring any server roundtrip.
 */
export function parseCharacterJsonToBuild(params: {
  game?: GameId;
  characterName?: string;
  passivesJson?: string | GggPassiveSkillsResponse;
  itemsJson?: string | GggItemsResponse;
}): Build {
  const game: GameId = params.game ?? 'poe1';
  const passives: GggPassiveSkillsResponse =
    typeof params.passivesJson === 'string' && params.passivesJson.trim()
      ? (JSON.parse(params.passivesJson) as GggPassiveSkillsResponse)
      : typeof params.passivesJson === 'object' && params.passivesJson
        ? params.passivesJson
        : {};
  const itemsPayload: GggItemsResponse =
    typeof params.itemsJson === 'string' && params.itemsJson.trim()
      ? (JSON.parse(params.itemsJson) as GggItemsResponse)
      : typeof params.itemsJson === 'object' && params.itemsJson
        ? params.itemsJson
        : {};

  const tree = getTreeForGame(game);
  const classes = getClassesForGame(game);
  const charMeta = itemsPayload.character;

  // Match class or ascendancy name from GGG character payload
  let classId = classes[0]!.id;
  let ascendancyId = '';
  const rawClass = charMeta?.class?.trim();
  if (rawClass) {
    const exactClass = classes.find((c) => c.id.toLowerCase() === rawClass.toLowerCase());
    if (exactClass) {
      classId = exactClass.id;
    } else {
      for (const c of classes) {
        const asc = c.ascendancies.find((a) => a.id.toLowerCase() === rawClass.toLowerCase());
        if (asc) {
          classId = c.id;
          ascendancyId = asc.id;
          break;
        }
      }
    }
  }

  const startNodeId = tree.classStartNodeIds[classId] ?? Object.values(tree.classStartNodeIds)[0]!;
  const hashSet = new Set<number>([startNodeId]);
  for (const h of passives.hashes ?? []) {
    if (typeof h === 'number' && Number.isFinite(h)) hashSet.add(h);
  }
  for (const h of passives.hashes_ex ?? []) {
    if (typeof h === 'number' && Number.isFinite(h)) hashSet.add(h);
  }

  // Convert equipped items & extract socketed gems into SkillGroups
  const items: Record<string, Item> = {};
  const equipped: Partial<Record<EquipmentSlotId, string>> = {};
  const activeFlaskSlots: Partial<Record<EquipmentSlotId, boolean>> = {};
  const skills: SkillGroup[] = [];
  const gemsCatalog = getGemsForGame(game);

  const matchGemId = (gemName: string): string | undefined => {
    const clean = cleanGggName(gemName).replace(/\s+Support$/i, '').toLowerCase();
    const found = gemsCatalog.find(
      (g) =>
        g.name.en.replace(/\s+Support$/i, '').toLowerCase() === clean ||
        g.name.zh.toLowerCase() === clean,
    );
    return found?.id;
  };

  let idx = 0;
  for (const rawItem of itemsPayload.items ?? []) {
    idx++;
    const { item, slot } = convertRawItem(rawItem, game, idx);
    if (!slot) continue;
    items[item.id] = item;
    equipped[slot] = item.id;
    if (slot.startsWith('Flask ')) {
      activeFlaskSlots[slot] = true;
    }

    if (rawItem.socketedItems && rawItem.socketedItems.length > 0) {
      const groupGems: GemInstance[] = [];
      rawItem.socketedItems.forEach((sg, gi) => {
        const gName = sg.baseType || sg.typeLine || '';
        const gemId = matchGemId(gName);
        if (!gemId) return;
        groupGems.push({
          instanceId: `ggg_gem_${idx}_${gi}`,
          gemId,
          level: extractNumericProp(sg.properties, 'Level', 20),
          quality: extractNumericProp(sg.properties, 'Quality', 0),
          enabled: true,
        });
      });
      if (groupGems.length > 0) {
        skills.push({
          id: `ggg_sg_${idx}`,
          label: `${slot} (${rawItem.socketedItems[0]?.baseType ?? 'Skills'})`,
          enabled: true,
          slot,
          gems: groupGems,
        });
      }
    }
  }

  // Pick largest non-aura skill group as main skill
  let mainSkillGroupId = skills[0]?.id ?? '';
  let bestScore = -1;
  for (const sg of skills) {
    const hasActiveNonAura = sg.gems.some((gi) => {
      const def = gemsCatalog.find((g) => g.id === gi.gemId);
      return def?.category === 'active' && !def.isAuraOrBuff;
    });
    const score = (hasActiveNonAura ? 100 : 0) + sg.gems.length;
    if (score > bestScore) {
      bestScore = score;
      mainSkillGroupId = sg.id;
    }
  }

  // Fallback skill group if only passives JSON was provided
  if (skills.length === 0 && gemsCatalog.length > 0) {
    const fallbackGem = gemsCatalog.find((g) => g.category === 'active' && !g.isAuraOrBuff) ?? gemsCatalog[0]!;
    const sgId = 'ggg_sg_default';
    skills.push({
      id: sgId,
      label: fallbackGem.name.en,
      enabled: true,
      slot: game === 'poe1' ? 'Body Armour' : undefined,
      gems: [{ instanceId: 'ggg_g_0', gemId: fallbackGem.id, level: 20, quality: 0, enabled: true }],
    });
    mainSkillGroupId = sgId;
  }

  const level = Math.max(1, Math.min(100, charMeta?.level ?? 90));
  const buildName =
    params.characterName?.trim() ||
    charMeta?.name?.trim() ||
    `${rawClass || classId} (Lv.${level})`;

  return {
    id: `char_${Date.now()}`,
    name: buildName,
    game,
    level,
    classId,
    ascendancyId,
    activeWeaponSet: 1,
    bandit: 'None',
    tree: {
      title: `${buildName} Tree`,
      treeVersion: tree.version,
      allocatedNodeIds: [...hashSet],
      weaponSet1NodeIds: [],
      weaponSet2NodeIds: [],
      masteryEffects: {},
    },
    skills,
    mainSkillGroupId,
    items,
    equipped,
    ...(Object.keys(activeFlaskSlots).length > 0 ? { activeFlaskSlots } : {}),
    config: createDefaultConfig(),
    notes: `Imported from GGG/Tencent Character Profile (${charMeta?.league ?? 'Standard'}).`,
  };
}

export type PoeRealm = 'pc' | 'tencent';

export function getCharacterWindowBaseUrl(realm: PoeRealm): string {
  return realm === 'tencent'
    ? 'https://poe.game.qq.com/character-window'
    : 'https://www.pathofexile.com/character-window';
}

/**
 * Fetches `get-passive-skills` and `get-items` from GGG International or Tencent CN
 * via the user's configured CORS proxy and imports into a WebPoB `Build`.
 */
export async function fetchCharacterProfileBuild(params: {
  realm: PoeRealm;
  accountName: string;
  characterName: string;
  game?: GameId;
  corsProxyBase?: string;
}): Promise<Build> {
  const base = getCharacterWindowBaseUrl(params.realm);
  const qs = `accountName=${encodeURIComponent(params.accountName.trim())}&character=${encodeURIComponent(params.characterName.trim())}`;
  const passivesUrl = `${base}/get-passive-skills?${qs}&reqData=0`;
  const itemsUrl = `${base}/get-items?${qs}`;

  const wrap = (url: string) =>
    params.corsProxyBase?.trim()
      ? `${params.corsProxyBase.replace(/\/+$/, '')}/?url=${encodeURIComponent(url)}`
      : url;

  const [pRes, iRes] = await Promise.all([fetch(wrap(passivesUrl)), fetch(wrap(itemsUrl))]);
  if (!pRes.ok && !iRes.ok) {
    throw new Error(
      `HTTP ${pRes.status}/${iRes.status} — ensure profile is public and CORS proxy is configured.`,
    );
  }
  const passivesJson = pRes.ok ? ((await pRes.json()) as GggPassiveSkillsResponse) : undefined;
  const itemsJson = iRes.ok ? ((await iRes.json()) as GggItemsResponse) : undefined;

  return parseCharacterJsonToBuild({
    game: params.game ?? 'poe1',
    characterName: params.characterName,
    passivesJson,
    itemsJson,
  });
}
