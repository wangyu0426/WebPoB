import type { ArmourBaseStats, WeaponBaseStats } from '@webpob/core';

export interface BaseItemStatsEntry {
  armour?: ArmourBaseStats;
  weapon?: WeaponBaseStats;
}

/**
 * Official Path of Building (3.30 / 0.5) midpoint base item stats.
 * Used when official PoB XML `<Item>` entries omit pre-computed local Armour/ES/Weapon lines
 * so our calculation matches Path of Building's item base computation.
 */
export const BASE_ITEM_STATS: Record<string, BaseItemStatsEntry> = {
  // PoE 1 Body Armours (max base roll / 100% percentile, matching PoB default for newly crafted items)
  'Vaal Regalia': { armour: { energyShield: 197 } },
  'Glorious Plate': { armour: { armour: 892 } },
  'Sadist Garb': { armour: { evasion: 491, energyShield: 107 } },
  'Astral Plate': { armour: { armour: 817 } },
  // PoE 1 Shields / Helmets / Gloves / Boots
  'Titanium Spirit Shield': { armour: { energyShield: 77, blockChance: 25 } },
  'Vaal Spirit Shield': { armour: { energyShield: 67, blockChance: 22 } },
  'Hubris Circlet': { armour: { energyShield: 90 } },
  'Sorcerer Boots': { armour: { energyShield: 58 } },
  'Fingerless Silk Gloves': { armour: { energyShield: 50 } },
  // PoE 1 Weapons
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

export function getBaseItemStats(baseName: string, quality = 0): BaseItemStatsEntry | undefined {
  const entry = BASE_ITEM_STATS[baseName];
  if (!entry) return undefined;
  const qMult = 1 + Math.max(0, quality) / 100;
  return {
    armour: entry.armour
      ? {
          armour: entry.armour.armour ? Math.round(entry.armour.armour * qMult) : undefined,
          evasion: entry.armour.evasion ? Math.round(entry.armour.evasion * qMult) : undefined,
          energyShield: entry.armour.energyShield ? Math.round(entry.armour.energyShield * qMult) : undefined,
          blockChance: entry.armour.blockChance,
        }
      : undefined,
    weapon: entry.weapon
      ? {
          ...entry.weapon,
          physicalMin: Math.round(entry.weapon.physicalMin * qMult),
          physicalMax: Math.round(entry.weapon.physicalMax * qMult),
        }
      : undefined,
  };
}
