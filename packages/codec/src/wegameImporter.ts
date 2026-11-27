import type {
  ArmourBaseStats,
  Build,
  EquipmentSlotId,
  GemDefinition,
  GemInstance,
  Item,
  ItemRarity,
  SkillGroup,
  WeaponBaseStats,
} from '@webpob/core';
import {
  createDefaultConfig,
  getBaseItemStats,
  getClassesForGame,
  getGemsForGame,
  getTreeForGame,
} from '@webpob/data';

const WEGAME_POE2_API_BASE = 'https://www.wegame.com.cn/api/v1/wegame.pallas.poe2.Profile';
const WEGAME_SHARE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?wegame\.com\.cn\/helper\/poe2\/?#\/share\/([A-Za-z0-9_%~.=+-]+)/i;

export interface WeGameModEntry {
  description?: string;
  flags?: Record<string, unknown>;
}

export interface WeGameProperty {
  name?: string;
  values?: Array<[string, number]>;
}

export interface WeGameRawGem {
  baseType?: string;
  typeLine?: string;
  inventoryId?: string | null;
  support?: boolean;
  properties?: WeGameProperty[];
  socketedItems?: WeGameRawGem[];
}

export interface WeGameRawEquipment {
  id?: string;
  name?: string;
  baseType?: string;
  typeLine?: string;
  inventoryId?: string;
  frameType?: number;
  rarity?: string;
  ilvl?: number;
  properties?: WeGameProperty[];
  implicitMods?: Array<string | WeGameModEntry>;
  explicitMods?: Array<string | WeGameModEntry>;
  enchantMods?: Array<string | WeGameModEntry>;
  runeMods?: Array<string | WeGameModEntry>;
  craftedMods?: Array<string | WeGameModEntry>;
  fracturedMods?: Array<string | WeGameModEntry>;
}

export interface WeGameRawJewelSlot {
  socket_id?: string;
  socket_name?: string;
  jewel?: {
    id?: string;
    display_name?: string;
    name?: string;
    rarity?: number;
    level?: number;
    mod_descriptions?: Array<{ type?: number; values?: string[] }>;
  };
}

export interface WeGamePoe2Bundle {
  shareCode?: string;
  roleInfo?: {
    role?: {
      role_id?: string;
      name?: string;
      level?: number;
      class_name?: string;
      phrase?: string;
      league_id?: string;
    };
  };
  roleProfile?: {
    skills?: Array<{ name?: string; total_dps?: string | number }>;
  };
  talentTree?: {
    talent_tree?: {
      hashes?: number[];
      specialisations?: {
        set1?: number[];
        set2?: number[];
      };
      quest_stats?: string[];
    };
  };
  equipments?: {
    equipments?: WeGameRawEquipment[];
  };
  skills?: {
    skills?: WeGameRawGem[];
  };
  jewels?: {
    jewel_data?: string | WeGameRawJewelSlot[];
  };
}

/**
 * Extracts the public share hash from a WeGame PoE 2 Helper share URL
 * (e.g. `https://www.wegame.com.cn/helper/poe2/#/share/<hash>`).
 */
export function extractWeGamePoe2ShareCode(input: string): string | null {
  const trimmed = input.trim();
  const m = trimmed.match(WEGAME_SHARE_REGEX);
  if (!m?.[1]) return null;
  let code = m[1].split(/[?#&]/)[0] ?? '';
  try {
    code = decodeURIComponent(code);
  } catch {
    // keep raw token if malformed percent-encoding
  }
  code = code.trim();
  if (!/^[A-Za-z0-9_=-]{8,256}$/.test(code)) return null;
  return code;
}

export function isWeGamePoe2ShareUrl(input: string): boolean {
  return extractWeGamePoe2ShareCode(input) !== null;
}

/**
 * Strips PoE 2 / WeGame inline keyword markup `[Key|Display]` -> `Display`
 * and collapses extra whitespace.
 */
export function cleanWeGameMarkup(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/\[(?:[^|\]]+\|)?([^\]]+)\]/g, '$1')
    .replace(/<<[^>]+>>/g, '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractModLines(list?: Array<string | WeGameModEntry>): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const entry of list) {
    const raw = typeof entry === 'string' ? entry : entry?.description;
    const cleaned = cleanWeGameMarkup(raw);
    if (cleaned) out.push(cleaned);
  }
  return out;
}

function mapRarity(frameType?: number, rarity?: string): ItemRarity {
  const r = (rarity ?? '').toUpperCase();
  if (r === 'UNIQUE' || frameType === 3) return 'UNIQUE';
  if (r === 'RARE' || frameType === 2 || frameType === 13) return 'RARE';
  if (r === 'MAGIC' || frameType === 1) return 'MAGIC';
  return 'NORMAL';
}

function parseRange(raw?: string): [number, number] | null {
  if (!raw) return null;
  const m = raw.match(/(\d+(?:\.\d+)?)\s*[-–~]\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

function parseFirstNumber(raw?: string): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function inferWeaponType(
  rawProps: WeGameProperty[] | undefined,
  baseName: string,
): { weaponType: WeaponBaseStats['weaponType']; twoHanded: boolean } {
  const joined = `${baseName} ${(rawProps ?? []).map((p) => cleanWeGameMarkup(p.name)).join(' ')}`;
  if (/战弩|弩|Crossbow/i.test(joined)) return { weaponType: 'Crossbow', twoHanded: true };
  if (/长弓|弓|Bow/i.test(joined)) return { weaponType: 'Bow', twoHanded: true };
  if (/细杖|Quarterstaff/i.test(joined)) return { weaponType: 'Quarterstaff', twoHanded: true };
  if (/长杖|Staff/i.test(joined)) return { weaponType: 'Staff', twoHanded: true };
  if (/法杖|Wand/i.test(joined)) return { weaponType: 'Wand', twoHanded: false };
  if (/匕首|Dagger/i.test(joined)) return { weaponType: 'Dagger', twoHanded: false };
  if (/爪|Claw/i.test(joined)) return { weaponType: 'Claw', twoHanded: false };
  if (/斧|Axe/i.test(joined)) return { weaponType: 'Axe', twoHanded: /双手|Two Hand/i.test(joined) };
  if (/锤|权杖|Mace|Sceptre|Flail/i.test(joined)) {
    return { weaponType: 'Mace', twoHanded: /双手|Two Hand/i.test(joined) };
  }
  return { weaponType: 'Sword', twoHanded: /双手|Two Hand/i.test(joined) };
}

function parseWeGameItemProperties(
  props: WeGameProperty[] | undefined,
  baseName: string,
): {
  quality: number;
  armour?: ArmourBaseStats;
  weapon?: WeaponBaseStats;
  isCharm: boolean;
} {
  let quality = 0;
  let armour = 0;
  let evasion = 0;
  let energyShield = 0;
  let blockChance: number | undefined;
  let physRange: [number, number] | null = null;
  const elementalDamage: Partial<Record<'Fire' | 'Cold' | 'Lightning' | 'Chaos', [number, number]>> = {};
  let critChance: number | null = null;
  let aps: number | null = null;
  let isCharm = false;

  for (const prop of props ?? []) {
    const name = cleanWeGameMarkup(prop.name);
    const val0 = prop.values?.[0]?.[0];

    if (name === '咒符' || /^Charm$/i.test(name)) {
      isCharm = true;
    } else if (/品质|Quality/i.test(name)) {
      const q = parseFirstNumber(val0);
      if (q !== null) quality = Math.round(q);
    } else if (/^(?:护甲|护甲值|Armour)$/i.test(name) && val0) {
      const v = parseFirstNumber(val0);
      if (v !== null) armour = v;
    } else if (/^(?:闪避|闪避值|Evasion Rating|Evasion)$/i.test(name) && val0) {
      const v = parseFirstNumber(val0);
      if (v !== null) evasion = v;
    } else if (/^(?:能量护盾|Energy Shield)$/i.test(name) && val0) {
      const v = parseFirstNumber(val0);
      if (v !== null) energyShield = v;
    } else if (/格挡几率|Chance to Block/i.test(name) && val0) {
      const v = parseFirstNumber(val0);
      if (v !== null) blockChance = v;
    } else if (/物理伤害|Physical Damage/i.test(name) && val0) {
      physRange = parseRange(val0);
    } else if (/火焰伤害|Fire Damage/i.test(name) && val0) {
      const r = parseRange(val0);
      if (r) elementalDamage.Fire = r;
    } else if (/冰霜伤害|冰冷伤害|Cold Damage/i.test(name) && val0) {
      const r = parseRange(val0);
      if (r) elementalDamage.Cold = r;
    } else if (/闪电伤害|Lightning Damage/i.test(name) && val0) {
      const r = parseRange(val0);
      if (r) elementalDamage.Lightning = r;
    } else if (/混沌伤害|Chaos Damage/i.test(name) && val0) {
      const r = parseRange(val0);
      if (r) elementalDamage.Chaos = r;
    } else if (/元素伤害|Elemental Damage/i.test(name)) {
      for (const pair of prop.values ?? []) {
        const r = parseRange(pair[0]);
        if (!r) continue;
        // GGG/WeGame value[1] color codes: 4=Fire, 5=Cold, 6=Lightning, 7=Chaos
        const code = pair[1];
        if (code === 4) elementalDamage.Fire = r;
        else if (code === 5) elementalDamage.Cold = r;
        else if (code === 6) elementalDamage.Lightning = r;
        else if (code === 7) elementalDamage.Chaos = r;
        else elementalDamage.Lightning = r;
      }
    } else if (/暴击率|暴击几率|Critical Strike Chance/i.test(name) && val0) {
      const v = parseFirstNumber(val0);
      if (v !== null) critChance = v;
    } else if (/每秒攻击次数|Attacks per Second/i.test(name) && val0) {
      const v = parseFirstNumber(val0);
      if (v !== null) aps = v;
    }
  }

  const armourStats: ArmourBaseStats | undefined =
    armour > 0 || evasion > 0 || energyShield > 0 || blockChance !== undefined
      ? {
          ...(armour > 0 ? { armour } : {}),
          ...(evasion > 0 ? { evasion } : {}),
          ...(energyShield > 0 ? { energyShield } : {}),
          ...(blockChance !== undefined ? { blockChance } : {}),
        }
      : undefined;

  const hasEle = Object.keys(elementalDamage).length > 0;
  const inferred = inferWeaponType(props, baseName);
  const weaponStats: WeaponBaseStats | undefined =
    physRange || hasEle || aps !== null
      ? {
          physicalMin: physRange?.[0] ?? 0,
          physicalMax: physRange?.[1] ?? 0,
          ...(hasEle ? { elementalDamage } : {}),
          critChance: critChance ?? 5,
          attacksPerSecond: aps ?? 1.2,
          weaponType: inferred.weaponType,
          twoHanded: inferred.twoHanded,
        }
      : undefined;

  return { quality, armour: armourStats, weapon: weaponStats, isCharm };
}

const WEGAME_INVENTORY_TO_SLOT: Record<string, EquipmentSlotId> = {
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

function buildGemLookup(catalog: GemDefinition[]): (rawName?: string) => GemDefinition | undefined {
  const byZh = new Map<string, GemDefinition>();
  const byEn = new Map<string, GemDefinition>();

  for (const gem of catalog) {
    const zh = gem.name.zh.trim().toLowerCase();
    const en = gem.name.en.trim().toLowerCase();
    if (zh) {
      byZh.set(zh, gem);
      byZh.set(zh.replace(/辅助$/, ''), gem);
      byZh.set(zh.replace(/\s+[ivx]+$/i, ''), gem);
    }
    if (en) {
      byEn.set(en, gem);
      byEn.set(en.replace(/\s+support$/i, ''), gem);
      byEn.set(en.replace(/\s+[ivx]+$/i, ''), gem);
    }
  }

  return (rawName?: string) => {
    const clean = cleanWeGameMarkup(rawName).toLowerCase();
    if (!clean) return undefined;
    const noTier = clean.replace(/\s+[ivx]+$/i, '').trim();
    const noSupZh = noTier.replace(/辅助$/, '').trim();
    const noSupEn = noTier.replace(/\s+support$/i, '').trim();
    return (
      byZh.get(clean) ??
      byZh.get(noTier) ??
      byZh.get(noSupZh) ??
      byZh.get(`${noTier}辅助`) ??
      byEn.get(clean) ??
      byEn.get(noTier) ??
      byEn.get(noSupEn)
    );
  };
}

function extractGemLevelAndQuality(props?: WeGameProperty[]): { level: number; quality: number } {
  let level = 20;
  let quality = 0;
  for (const p of props ?? []) {
    const name = cleanWeGameMarkup(p.name);
    const val0 = p.values?.[0]?.[0];
    if (!val0) continue;
    if (/^(?:等级|Level)$/i.test(name)) {
      const n = parseFirstNumber(val0);
      if (n !== null) level = Math.max(1, Math.min(30, Math.round(n)));
    } else if (/^(?:品质|Quality)$/i.test(name)) {
      const n = parseFirstNumber(val0);
      if (n !== null) quality = Math.max(0, Math.min(30, Math.round(n)));
    }
  }
  return { level, quality };
}

/**
 * Pure parser converting WeGame PoE 2 Helper share API payloads into a complete WebPoB `Build`.
 */
export function parseWeGamePoe2Build(bundle: WeGamePoe2Bundle): Build {
  const game = 'poe2' as const;
  const tree = getTreeForGame(game);
  const classes = getClassesForGame(game);
  const gemsCatalog = getGemsForGame(game);
  const matchGem = buildGemLookup(gemsCatalog);

  const role = bundle.roleInfo?.role;
  const rawClassName = cleanWeGameMarkup(role?.class_name);
  const normClass = rawClassName.toLowerCase().replace(/[\s_-]+/g, '');

  let classId = classes[0]!.id;
  let ascendancyId = '';
  if (normClass) {
    const directClass = classes.find(
      (c) =>
        c.id.toLowerCase().replace(/[\s_-]+/g, '') === normClass ||
        c.name.en.toLowerCase().replace(/[\s_-]+/g, '') === normClass ||
        c.name.zh.toLowerCase().replace(/[\s_-]+/g, '') === normClass,
    );
    if (directClass) {
      classId = directClass.id;
    } else {
      for (const c of classes) {
        const asc = c.ascendancies.find(
          (a) =>
            a.id.toLowerCase().replace(/[\s_-]+/g, '') === normClass ||
            a.name.en.toLowerCase().replace(/[\s_-]+/g, '') === normClass ||
            a.name.zh.toLowerCase().replace(/[\s_-]+/g, '') === normClass,
        );
        if (asc) {
          classId = c.id;
          ascendancyId = asc.id;
          break;
        }
      }
    }
  }

  // Passive tree + Weapon Set I / II dual trees
  const startNodeId = tree.classStartNodeIds[classId] ?? Object.values(tree.classStartNodeIds)[0]!;
  const hashSet = new Set<number>([startNodeId]);
  const rawTree = bundle.talentTree?.talent_tree;
  for (const h of rawTree?.hashes ?? []) {
    if (typeof h === 'number' && Number.isFinite(h)) hashSet.add(h);
  }
  const weaponSet1NodeIds = (rawTree?.specialisations?.set1 ?? []).filter(
    (h): h is number => typeof h === 'number' && Number.isFinite(h),
  );
  const weaponSet2NodeIds = (rawTree?.specialisations?.set2 ?? []).filter(
    (h): h is number => typeof h === 'number' && Number.isFinite(h),
  );

  // Equipped items (armour, weapons, jewellery, flasks, charms)
  const items: Record<string, Item> = {};
  const equipped: Partial<Record<EquipmentSlotId, string>> = {};
  const activeFlaskSlots: Partial<Record<EquipmentSlotId, boolean>> = {};
  const usedFlaskSlots = new Set<EquipmentSlotId>();
  const usedCharmSlots = new Set<EquipmentSlotId>();

  const nextFreeSlot = (candidates: EquipmentSlotId[], used: Set<EquipmentSlotId>): EquipmentSlotId | undefined => {
    for (const s of candidates) {
      if (!used.has(s)) {
        used.add(s);
        return s;
      }
    }
    return undefined;
  };

  let itemIdx = 0;
  for (const rawEq of bundle.equipments?.equipments ?? []) {
    itemIdx++;
    const baseName = cleanWeGameMarkup(rawEq.baseType || rawEq.typeLine) || 'Unknown Base';
    const name = cleanWeGameMarkup(rawEq.name) || baseName;
    const parsedProps = parseWeGameItemProperties(rawEq.properties, baseName);
    const isCharm = parsedProps.isCharm || baseName.includes('咒符') || /Charm$/i.test(baseName);

    let slot: EquipmentSlotId | undefined;
    if (rawEq.inventoryId === 'Flask') {
      if (isCharm) {
        slot = nextFreeSlot(['Charm 1', 'Charm 2', 'Charm 3'], usedCharmSlots);
      } else if (baseName.includes('生命')) {
        slot = nextFreeSlot(['Flask 1', 'Flask 2'], usedFlaskSlots);
      } else if (baseName.includes('魔力')) {
        slot = nextFreeSlot(['Flask 2', 'Flask 1'], usedFlaskSlots);
      } else {
        slot = nextFreeSlot(['Flask 1', 'Flask 2'], usedFlaskSlots);
      }
    } else if (rawEq.inventoryId) {
      slot = WEGAME_INVENTORY_TO_SLOT[rawEq.inventoryId];
    }
    if (!slot) continue;

    const fallbackStats = getBaseItemStats(baseName, 0, game);
    const weaponStats = parsedProps.weapon ?? fallbackStats?.weapon;
    const armourStats = parsedProps.armour ?? fallbackStats?.armour;
    const localStatsPrecomputed = Boolean(parsedProps.weapon || parsedProps.armour);

    const implicits = [
      ...extractModLines(rawEq.enchantMods),
      ...extractModLines(rawEq.implicitMods),
      ...extractModLines(rawEq.runeMods),
    ];
    const explicits = [
      ...extractModLines(rawEq.fracturedMods),
      ...extractModLines(rawEq.explicitMods),
      ...extractModLines(rawEq.craftedMods),
    ];

    const id = rawEq.id ? `wg_${rawEq.id.slice(0, 12)}` : `wg_item_${itemIdx}`;
    items[id] = {
      id,
      name,
      baseName,
      rarity: mapRarity(rawEq.frameType, rawEq.rarity),
      slotType: slot,
      quality: parsedProps.quality,
      weaponStats,
      armourStats,
      implicits,
      explicits,
      localStatsPrecomputed,
    };
    equipped[slot] = id;
    if (slot.startsWith('Flask ') || slot.startsWith('Charm ')) {
      activeFlaskSlots[slot] = true;
    }
  }

  // Passive tree jewels (stored in items & summarized in notes)
  const rawJewelList: WeGameRawJewelSlot[] = (() => {
    const jd = bundle.jewels?.jewel_data;
    if (Array.isArray(jd)) return jd;
    if (typeof jd === 'string' && jd.trim()) {
      try {
        const parsed = JSON.parse(jd);
        return Array.isArray(parsed) ? (parsed as WeGameRawJewelSlot[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  })();

  const jewelSummaries: string[] = [];
  rawJewelList.forEach((slotEntry, idx) => {
    const j = slotEntry.jewel;
    if (!j) return;
    const jName = cleanWeGameMarkup(j.display_name || j.name) || `Jewel ${idx + 1}`;
    const jBase = cleanWeGameMarkup(j.name) || 'Jewel';
    const jMods: string[] = [];
    for (const md of j.mod_descriptions ?? []) {
      for (const v of md.values ?? []) {
        const cleaned = cleanWeGameMarkup(v);
        if (cleaned) jMods.push(cleaned);
      }
    }
    const id = j.id ? `wg_jewel_${j.id.slice(0, 12)}` : `wg_jewel_${idx + 1}`;
    items[id] = {
      id,
      name: jName,
      baseName: jBase,
      rarity: mapRarity(j.rarity),
      slotType: 'Any',
      quality: 0,
      implicits: [],
      explicits: jMods,
      localStatsPrecomputed: false,
    };
    jewelSummaries.push(`- ${slotEntry.socket_name || slotEntry.socket_id || `Jewel ${idx + 1}`}: ${jName} (${jBase})${jMods.length ? ` — ${jMods.join(' / ')}` : ''}`);
  });

  // Skills & Support Gems
  const skills: SkillGroup[] = [];
  const seenBareActiveIds = new Set<string>();
  let groupIdx = 0;

  for (const rawSk of bundle.skills?.skills ?? []) {
    const activeDef = matchGem(rawSk.baseType || rawSk.typeLine);
    if (!activeDef) continue;

    const supportList = rawSk.socketedItems ?? [];
    // Deduplicate bare weapon-granted skills (e.g. duplicate Spear Throw with 0 supports)
    if (supportList.length === 0 && seenBareActiveIds.has(activeDef.id)) {
      continue;
    }
    if (supportList.length === 0) {
      seenBareActiveIds.add(activeDef.id);
    }

    groupIdx++;
    const { level, quality } = extractGemLevelAndQuality(rawSk.properties);
    const groupGems: GemInstance[] = [
      {
        instanceId: `wg_g_${groupIdx}_0`,
        gemId: activeDef.id,
        level,
        quality,
        enabled: true,
      },
    ];

    supportList.forEach((rawSup, si) => {
      const supDef = matchGem(rawSup.baseType || rawSup.typeLine);
      if (!supDef) return;
      const supMeta = extractGemLevelAndQuality(rawSup.properties);
      groupGems.push({
        instanceId: `wg_g_${groupIdx}_${si + 1}`,
        gemId: supDef.id,
        level: supMeta.level,
        quality: supMeta.quality,
        enabled: true,
      });
    });

    skills.push({
      id: `wg_sg_${groupIdx}`,
      label: cleanWeGameMarkup(rawSk.baseType || activeDef.name.zh || activeDef.name.en),
      enabled: true,
      weaponSets: [1, 2],
      gems: groupGems,
    });
  }

  // Build normalized lookup of WeGame roleProfile top DPS skills (sorted descending)
  const profileRankByNorm = new Map<string, number>();
  const sortedProfileSkills = [...(bundle.roleProfile?.skills ?? [])]
    .filter((s) => s.name && Number(s.total_dps) > 0)
    .sort((a, b) => Number(b.total_dps) - Number(a.total_dps));
  sortedProfileSkills.forEach((s, idx) => {
    const norm = s.name!.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (norm && !profileRankByNorm.has(norm)) {
      profileRankByNorm.set(norm, Math.max(10, 60 - idx * 15));
    }
  });

  // Pick best non-aura active skill group (prefer WeGame top-DPS match & most linked supports)
  let mainSkillGroupId = skills[0]?.id ?? '';
  let bestScore = -1;
  for (const sg of skills) {
    const primaryDef = gemsCatalog.find((g) => g.id === sg.gems[0]?.gemId);
    const isAttackOrSpell = Boolean(primaryDef && primaryDef.category === 'active' && !primaryDef.isAuraOrBuff);
    let profileBonus = 0;
    for (const gemInst of sg.gems) {
      const def = gemsCatalog.find((g) => g.id === gemInst.gemId);
      if (!def) continue;
      const normEn = def.name.en.toLowerCase().replace(/[^a-z0-9]/g, '');
      const rank = profileRankByNorm.get(normEn);
      if (rank) {
        const weighted = gemInst === sg.gems[0] ? rank : Math.round(rank * 0.7);
        if (weighted > profileBonus) profileBonus = weighted;
      }
    }
    const isMinion = primaryDef?.tags.some((t) => t.toLowerCase() === 'minion') ?? false;
    const score = (isAttackOrSpell ? 100 : 0) + (isMinion ? -15 : 0) + profileBonus + sg.gems.length * 10;
    if (score > bestScore) {
      bestScore = score;
      mainSkillGroupId = sg.id;
    }
  }

  if (skills.length === 0 && gemsCatalog.length > 0) {
    const fallbackGem = gemsCatalog.find((g) => g.category === 'active' && !g.isAuraOrBuff) ?? gemsCatalog[0]!;
    skills.push({
      id: 'wg_sg_default',
      label: fallbackGem.name.zh || fallbackGem.name.en,
      enabled: true,
      weaponSets: [1, 2],
      gems: [{ instanceId: 'wg_g_0', gemId: fallbackGem.id, level: 20, quality: 0, enabled: true }],
    });
    mainSkillGroupId = 'wg_sg_default';
  }

  const level = Math.max(1, Math.min(100, Number(role?.level) || 90));
  const charName = cleanWeGameMarkup(role?.name);
  const buildName = charName
    ? `${charName} (Lv.${level})`
    : `${rawClassName || classId} (Lv.${level})`;

  const noteLines: string[] = [
    `Imported from WeGame PoE 2 Helper (${rawClassName || classId}, Lv.${level}).`,
  ];
  const refSkills = (bundle.roleProfile?.skills ?? []).filter((s) => Number(s.total_dps) > 0);
  if (refSkills.length > 0) {
    noteLines.push(
      '',
      'WeGame Reference Panel DPS:',
      ...refSkills.map((s) => `- ${s.name}: ${Number(s.total_dps).toLocaleString('en-US')}`),
    );
  }
  const questStats = (rawTree?.quest_stats ?? []).map((q) => cleanWeGameMarkup(q)).filter(Boolean);
  if (questStats.length > 0) {
    noteLines.push('', 'Quest / Permanent Bonuses:', ...questStats.map((q) => `- ${q}`));
  }
  if (jewelSummaries.length > 0) {
    noteLines.push('', 'Socketed Passive Jewels:', ...jewelSummaries);
  }

  return {
    id: `wegame_${Date.now()}`,
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
      weaponSet1NodeIds,
      weaponSet2NodeIds,
      masteryEffects: {},
    },
    skills,
    mainSkillGroupId,
    items,
    equipped,
    ...(Object.keys(activeFlaskSlots).length > 0 ? { activeFlaskSlots } : {}),
    config: createDefaultConfig(),
    notes: noteLines.join('\n'),
  };
}

async function postWeGameEndpoint<T>(
  endpoint: string,
  payload: Record<string, unknown>,
  corsProxyBase?: string,
): Promise<T> {
  const fullEndpoint = `${WEGAME_POE2_API_BASE}/${endpoint}`;
  const proxyBase = corsProxyBase?.trim().replace(/\/+$/, '');
  const fetchUrl = proxyBase
    ? `${proxyBase}?url=${encodeURIComponent(fullEndpoint)}`
    : fullEndpoint;

  const res = await fetch(fetchUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`WeGame ${endpoint} failed (HTTP ${res.status})`);
  }
  const data = (await res.json()) as { result?: { error_code?: number; error_message?: string } } & T;
  if (data.result && data.result.error_code !== undefined && data.result.error_code !== 0) {
    throw new Error(`WeGame ${endpoint} error: ${data.result.error_message || data.result.error_code}`);
  }
  return data;
}

/**
 * Fetches a public WeGame PoE 2 Helper share link (zero login / zero cookies)
 * via the CORS proxy and converts it into a complete WebPoB `Build`.
 */
export async function fetchWeGamePoe2Build(
  shareUrlOrCode: string,
  corsProxyBase?: string,
): Promise<Build> {
  const shareCode =
    extractWeGamePoe2ShareCode(shareUrlOrCode) ??
    (/^[A-Za-z0-9_=-]{16,256}$/.test(shareUrlOrCode.trim()) ? shareUrlOrCode.trim() : null);

  if (!shareCode) {
    throw new Error('Invalid WeGame PoE 2 share link.');
  }

  const baseReq = { share_code: shareCode, area: 0, from_src: 'poe2_helper' };
  const roleInfo = await postWeGameEndpoint<NonNullable<WeGamePoe2Bundle['roleInfo']>>(
    'GetRoleInfo',
    baseReq,
    corsProxyBase,
  );
  const roleId = roleInfo.role?.role_id;
  if (!roleId) {
    throw new Error('WeGame share link did not return a valid character role.');
  }

  const detailReq = { ...baseReq, role_id: roleId };
  const [talentTree, equipments, skills, jewels, roleProfile] = await Promise.all([
    postWeGameEndpoint<NonNullable<WeGamePoe2Bundle['talentTree']>>('GetTalentTree', detailReq, corsProxyBase),
    postWeGameEndpoint<NonNullable<WeGamePoe2Bundle['equipments']>>('GetEquipments', detailReq, corsProxyBase),
    postWeGameEndpoint<NonNullable<WeGamePoe2Bundle['skills']>>('GetSkills', detailReq, corsProxyBase),
    postWeGameEndpoint<NonNullable<WeGamePoe2Bundle['jewels']>>('GetJewels', detailReq, corsProxyBase).catch(() => undefined),
    postWeGameEndpoint<NonNullable<WeGamePoe2Bundle['roleProfile']>>('GetRoleProfile', detailReq, corsProxyBase).catch(() => undefined),
  ]);

  return parseWeGamePoe2Build({
    shareCode,
    roleInfo,
    roleProfile,
    talentTree,
    equipments,
    skills,
    jewels,
  });
}
