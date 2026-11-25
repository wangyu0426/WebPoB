import type { ArmourBaseStats, GameId, WeaponBaseStats } from '@webpob/core';

export interface BaseItemStatsEntry {
  armour?: ArmourBaseStats;
  weapon?: WeaponBaseStats;
  implicit?: string;
}

export interface CompactBaseItemsPayload {
  game: GameId;
  count: number;
  bases: Record<
    string,
    {
      /** [armour, evasion, energyShield, blockChance, ward?] */
      a?: [number, number, number, number] | [number, number, number, number, number];
      /** [physMin, physMax, aps, crit, weaponType, twoHanded] */
      w?: [number, number, number, number, WeaponBaseStats['weaponType'], number];
      /** Default base implicit text */
      i?: string;
    }
  >;
}

/**
 * Built-in fallback base item stats (used before `/data/poe*-bases.json` loads in browser).
 * Full 989 PoE 1 + 1,642 PoE 2 base items are registered via `registerBaseItems` / `loadOfficialBaseItems`.
 */
export const BASE_ITEM_STATS: Record<string, BaseItemStatsEntry> = {
  'Vaal Regalia': { armour: { energyShield: 197 } },
  'Glorious Plate': { armour: { armour: 892 } },
  'Sadist Garb': { armour: { evasion: 491, energyShield: 107 } },
  'Astral Plate': { armour: { armour: 817 } },
  'Titanium Spirit Shield': { armour: { energyShield: 77, blockChance: 25 } },
  'Vaal Spirit Shield': { armour: { energyShield: 67, blockChance: 22 } },
  'Hubris Circlet': { armour: { energyShield: 90 } },
  'Sorcerer Boots': { armour: { energyShield: 58 } },
  'Fingerless Silk Gloves': { armour: { energyShield: 50 } },
  'Prophecy Wand': {
    weapon: { physicalMin: 26, physicalMax: 48, attacksPerSecond: 1.5, critChance: 8.7, weaponType: 'Wand', twoHanded: false },
  },
  'Imbued Wand': {
    weapon: { physicalMin: 29, physicalMax: 53, attacksPerSecond: 1.5, critChance: 8.0, weaponType: 'Wand', twoHanded: false },
  },
  'Spine Bow': {
    weapon: { physicalMin: 38, physicalMax: 115, attacksPerSecond: 1.4, critChance: 6.5, weaponType: 'Bow', twoHanded: true },
  },
  'Vaal Axe': {
    weapon: { physicalMin: 104, physicalMax: 174, attacksPerSecond: 1.15, critChance: 5.0, weaponType: 'Axe', twoHanded: true },
  },
};

const dynamicBases: Record<GameId, Record<string, BaseItemStatsEntry>> = {
  poe1: {},
  poe2: {},
};
const loadedBasesFlag: Partial<Record<GameId, boolean>> = {};

export const OFFICIAL_BASES_FILES: Record<GameId, string> = {
  poe1: 'poe1-bases.json',
  poe2: 'poe2-bases.json',
};

export function registerBaseItems(payload: CompactBaseItemsPayload): number {
  const target = dynamicBases[payload.game];
  let count = 0;
  for (const [name, compact] of Object.entries(payload.bases)) {
    const entry: BaseItemStatsEntry = {};
    if (compact.a) {
      const [arm, eva, es, blk, ward = 0] = compact.a;
      entry.armour = {
        ...(arm > 0 ? { armour: arm } : {}),
        ...(eva > 0 ? { evasion: eva } : {}),
        ...(es > 0 ? { energyShield: es } : {}),
        ...(blk > 0 ? { blockChance: blk } : {}),
        ...(ward > 0 ? { ward } : {}),
      };
    }
    if (compact.w) {
      const [pMin, pMax, aps, crit, wt, twoH] = compact.w;
      entry.weapon = {
        physicalMin: pMin,
        physicalMax: pMax,
        attacksPerSecond: aps,
        critChance: crit,
        weaponType: wt,
        twoHanded: twoH === 1,
      };
    }
    if (compact.i) {
      entry.implicit = compact.i;
    }
    target[name] = entry;
    count++;
  }
  loadedBasesFlag[payload.game] = true;
  return count;
}

export async function loadOfficialBaseItems(game: GameId, basePath = '/data'): Promise<number> {
  if (loadedBasesFlag[game]) return Object.keys(dynamicBases[game]).length;
  const url = `${basePath.replace(/\/+$/, '')}/${OFFICIAL_BASES_FILES[game]}`;
  const res = await fetch(url);
  if (!res.ok) return 0;
  const payload = (await res.json()) as CompactBaseItemsPayload;
  return registerBaseItems(payload);
}

/**
 * Official PoE 1 (3.30) Utility Flask base buff lines (applied when Flask slot is active).
 */
export const UTILITY_FLASK_BUFFS: Record<string, string[]> = {
  'Granite Flask': ['+1500 to Armour'],
  'Jade Flask': ['+1500 to Evasion Rating'],
  'Diamond Flask': ['100% increased Global Critical Strike Chance'],
  'Quicksilver Flask': ['40% increased Movement Speed'],
  'Silver Flask': ['Onslaught'],
  'Bismuth Flask': ['+35% to all Elemental Resistances'],
  'Amethyst Flask': ['+35% to Chaos Resistance'],
  'Ruby Flask': ['+5% to maximum Fire Resistance', '+40% to Fire Resistance'],
  'Sapphire Flask': ['+5% to maximum Cold Resistance', '+40% to Cold Resistance'],
  'Topaz Flask': ['+5% to maximum Lightning Resistance', '+40% to Lightning Resistance'],
  'Basalt Flask': ['20% more Armour'],
  'Stibnite Flask': ['20% more Evasion Rating'],
  'Sulphur Flask': ['40% increased Damage'],
  'Quartz Flask': ['+10% chance to Suppress Spell Damage'],
};

export function getBaseItemStats(
  baseName: string,
  quality = 0,
  game: GameId = 'poe1',
): BaseItemStatsEntry | undefined {
  const entry =
    dynamicBases[game][baseName] ??
    (loadedBasesFlag[game] ? undefined : BASE_ITEM_STATS[baseName]);
  if (!entry) return undefined;
  const qMult = 1 + Math.max(0, quality) / 100;
  return {
    armour: entry.armour
      ? {
          armour: entry.armour.armour ? Math.round(entry.armour.armour * qMult) : undefined,
          evasion: entry.armour.evasion ? Math.round(entry.armour.evasion * qMult) : undefined,
          energyShield: entry.armour.energyShield ? Math.round(entry.armour.energyShield * qMult) : undefined,
          blockChance: entry.armour.blockChance,
          ward: entry.armour.ward ? Math.round(entry.armour.ward * qMult) : undefined,
        }
      : undefined,
    weapon: entry.weapon
      ? {
          ...entry.weapon,
          physicalMin: Math.round(entry.weapon.physicalMin * qMult),
          physicalMax: Math.round(entry.weapon.physicalMax * qMult),
        }
      : undefined,
    implicit: entry.implicit,
  };
}
