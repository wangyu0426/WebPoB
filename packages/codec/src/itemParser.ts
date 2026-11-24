import type { ArmourBaseStats, EquipmentSlotId, Item, ItemRarity, WeaponBaseStats } from '@webpob/core';
import { normalizeStatLineToEn } from '@webpob/i18n';

const RARITY_MAP: Record<string, ItemRarity> = {
  normal: 'NORMAL',
  magic: 'MAGIC',
  rare: 'RARE',
  unique: 'UNIQUE',
  普通: 'NORMAL',
  魔法: 'MAGIC',
  稀有: 'RARE',
  传奇: 'UNIQUE',
  暗金: 'UNIQUE',
};

const SLOT_KEYWORDS: Array<{ pattern: RegExp; slot: EquipmentSlotId; weaponType?: WeaponBaseStats['weaponType']; twoHanded?: boolean }> = [
  { pattern: /wand|法杖/i, slot: 'Weapon 1', weaponType: 'Wand', twoHanded: false },
  { pattern: /quarterstaff|细杖|长杖/i, slot: 'Weapon 1', weaponType: 'Quarterstaff', twoHanded: true },
  { pattern: /staff|staves|长杖/i, slot: 'Weapon 1', weaponType: 'Staff', twoHanded: true },
  { pattern: /crossbow|弩/i, slot: 'Weapon 1', weaponType: 'Crossbow', twoHanded: true },
  { pattern: /bow|弓/i, slot: 'Weapon 1', weaponType: 'Bow', twoHanded: true },
  { pattern: /dagger|匕首/i, slot: 'Weapon 1', weaponType: 'Dagger', twoHanded: false },
  { pattern: /claw|爪/i, slot: 'Weapon 1', weaponType: 'Claw', twoHanded: false },
  { pattern: /two hand sword|双手剑/i, slot: 'Weapon 1', weaponType: 'Sword', twoHanded: true },
  { pattern: /sword|剑/i, slot: 'Weapon 1', weaponType: 'Sword', twoHanded: false },
  { pattern: /two hand axe|双手斧/i, slot: 'Weapon 1', weaponType: 'Axe', twoHanded: true },
  { pattern: /axe|斧/i, slot: 'Weapon 1', weaponType: 'Axe', twoHanded: false },
  { pattern: /two hand mace|双手锤/i, slot: 'Weapon 1', weaponType: 'Mace', twoHanded: true },
  { pattern: /mace|sceptre|短杖|锤/i, slot: 'Weapon 1', weaponType: 'Mace', twoHanded: false },
  { pattern: /shield|focus|quiver|盾|法器|箭袋/i, slot: 'Weapon 2' },
  { pattern: /helmet|circlet|crown|tiara|helm|头盔|头环|王冠/i, slot: 'Helmet' },
  { pattern: /body armour|robe|garb|plate|regalia|vestment|胸甲|长袍|战甲/i, slot: 'Body Armour' },
  { pattern: /gloves|gauntlets|mitts|手套|护手/i, slot: 'Gloves' },
  { pattern: /boots|greaves|sandals|shoes|鞋子|长靴|战靴|便鞋/i, slot: 'Boots' },
  { pattern: /amulet|talisman|项链|护身符/i, slot: 'Amulet' },
  { pattern: /ring|戒指|指环/i, slot: 'Ring 1' },
  { pattern: /belt|vise|腰带|束带/i, slot: 'Belt' },
  { pattern: /charm|护符/i, slot: 'Charm 1' },
  { pattern: /flask|药剂/i, slot: 'Flask 1' },
];

function inferSlotAndWeapon(hintText: string): {
  slotType: EquipmentSlotId | 'Any';
  weaponType?: WeaponBaseStats['weaponType'];
  twoHanded?: boolean;
} {
  for (const entry of SLOT_KEYWORDS) {
    if (entry.pattern.test(hintText)) {
      return {
        slotType: entry.slot,
        weaponType: entry.weaponType,
        twoHanded: entry.twoHanded,
      };
    }
  }
  return { slotType: 'Any' };
}

function stripAugmented(val: string): string {
  return val.replace(/\(augmented\)|\(unmet\)|（已增强）|（未满足）/gi, '').trim();
}

function parseDamageRange(val: string): [number, number] | null {
  const m = stripAugmented(val).match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

/**
 * Parses both English and Chinese Path of Exile 1/2 in-game `Ctrl+C` item text
 * as well as Path of Building XML `<Item>` text blocks into a normalized `Item`.
 */
export function parseItemText(rawText: string, idOverride?: string): Item | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const lines = trimmed
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return null;

  let rarity: ItemRarity = 'RARE';
  let itemClassHint = '';
  let quality = 0;
  let sockets: string | undefined;
  let levelReq: number | undefined;
  let implicitCountHint: number | null = null;

  const armourStats: ArmourBaseStats = {};
  let hasArmourStats = false;
  let physDamage: [number, number] | null = null;
  let critChance: number | null = null;
  let aps: number | null = null;
  const eleDamage: NonNullable<WeaponBaseStats['elementalDamage']> = {};

  // Split by PoE clipboard separator "--------" if present
  const hasSeparators = lines.some((l) => /^-{4,}$/.test(l));
  const sections: string[][] = [];
  if (hasSeparators) {
    let current: string[] = [];
    for (const line of lines) {
      if (/^-{4,}$/.test(line)) {
        if (current.length > 0) sections.push(current);
        current = [];
      } else {
        current.push(line);
      }
    }
    if (current.length > 0) sections.push(current);
  } else {
    sections.push(lines);
  }

  // Extract header info (Section 0)
  const headerLines = sections[0] ?? [];
  const nameCandidates: string[] = [];

  for (const line of headerLines) {
    const classMatch = line.match(/^(?:Item Class|物品类别)\s*[:：]\s*(.+)$/i);
    if (classMatch) {
      itemClassHint = classMatch[1]!.trim();
      continue;
    }
    const rarityMatch = line.match(/^(?:Rarity|稀\s*有\s*度)\s*[:：]\s*(.+)$/i);
    if (rarityMatch) {
      const key = rarityMatch[1]!.trim().toLowerCase();
      rarity = RARITY_MAP[key] ?? RARITY_MAP[rarityMatch[1]!.trim()] ?? 'RARE';
      continue;
    }
    if (!hasSeparators && /^(?:Quality|Sockets|LevelReq|Implicits|Armour|Evasion|Energy Shield|Item Level)\s*[:：]/i.test(line)) {
      continue;
    }
    nameCandidates.push(line);
  }

  let name = nameCandidates[0] ?? 'Custom Item';
  let baseName = nameCandidates.length >= 2 ? nameCandidates[1]! : name;
  if (rarity === 'NORMAL' || rarity === 'MAGIC') {
    baseName = name;
  }

  const statCandidates: string[] = [];
  const implicits: string[] = [];
  const explicits: string[] = [];

  // Process all lines for property metadata & stat lines
  const bodyLines = hasSeparators ? sections.slice(1).flatMap((sec, idx) => (idx > 0 ? ['__SEC__', ...sec] : sec)) : lines.slice(nameCandidates.length + 1);

  let afterImplicitsMarker = false;
  const collectedSections: string[][] = [[]];

  for (const line of bodyLines) {
    if (line === '__SEC__') {
      if (collectedSections[collectedSections.length - 1]!.length > 0) {
        collectedSections.push([]);
      }
      continue;
    }

    // Metadata properties
    const qualMatch = line.match(/^(?:Quality|品质)\s*[:：]\s*\+?(\d+)%?/i);
    if (qualMatch) {
      quality = Number(qualMatch[1]);
      continue;
    }

    const sockMatch = line.match(/^(?:Sockets|插槽)\s*[:：]\s*(.+)$/i);
    if (sockMatch) {
      sockets = sockMatch[1]!.trim();
      continue;
    }

    const lvlMatch = line.match(/^(?:LevelReq|Level|等级)\s*[:：]\s*(\d+)/i);
    if (lvlMatch) {
      levelReq = Number(lvlMatch[1]);
      continue;
    }

    const impCountMatch = line.match(/^Implicits\s*[:：]\s*(\d+)$/i);
    if (impCountMatch) {
      implicitCountHint = Number(impCountMatch[1]);
      afterImplicitsMarker = true;
      continue;
    }

    if (/^(?:Requirements|需求|Item Level|物品等级|Requires|需求等级|Corrupted|已腐化|Unidentified|未鉴定|Note|备注)/i.test(line)) {
      continue;
    }

    // Defensive base stats
    const armMatch = line.match(/^(?:Armour|护甲)\s*[:：]\s*(\d+)/i);
    if (armMatch) {
      armourStats.armour = Number(armMatch[1]);
      hasArmourStats = true;
      continue;
    }
    const evaMatch = line.match(/^(?:Evasion Rating|Evasion|闪避值|闪避)\s*[:：]\s*(\d+)/i);
    if (evaMatch) {
      armourStats.evasion = Number(evaMatch[1]);
      hasArmourStats = true;
      continue;
    }
    const esMatch = line.match(/^(?:Energy Shield|能量护盾)\s*[:：]\s*(\d+)/i);
    if (esMatch) {
      armourStats.energyShield = Number(esMatch[1]);
      hasArmourStats = true;
      continue;
    }
    const blkMatch = line.match(/^(?:Chance to Block|格挡几率|格挡率)\s*[:：]\s*(\d+)%/i);
    if (blkMatch) {
      armourStats.blockChance = Number(blkMatch[1]);
      hasArmourStats = true;
      continue;
    }

    // Weapon base stats
    const physMatch = line.match(/^(?:Physical Damage|物理伤害)\s*[:：]\s*(.+)$/i);
    if (physMatch) {
      physDamage = parseDamageRange(physMatch[1]!);
      continue;
    }
    const eleMatch = line.match(/^(?:Elemental Damage|元素伤害)\s*[:：]\s*(.+)$/i);
    if (eleMatch) {
      const range = parseDamageRange(eleMatch[1]!);
      if (range) eleDamage.Lightning = range;
      continue;
    }
    const critMatch = line.match(/^(?:Critical Strike Chance|Critical Hit Chance|暴击率)\s*[:：]\s*(\d+(?:\.\d+)?)%/i);
    if (critMatch) {
      critChance = Number(critMatch[1]);
      continue;
    }
    const apsMatch = line.match(/^(?:Attacks per Second|每秒攻击次数)\s*[:：]\s*(\d+(?:\.\d+)?)/i);
    if (apsMatch) {
      aps = Number(apsMatch[1]);
      continue;
    }

    // Skip standalone weapon class lines like "Wand" or "One Handed Sword"
    if (/^(?:One Handed|Two Handed|Bow|Wand|Staff|Quarterstaff|Crossbow|Dagger|Claw|单手|双手)/i.test(line) && !/\d/.test(line)) {
      itemClassHint = itemClassHint || line;
      continue;
    }

    // Ignore flavour text (lines without digits and without known flag keywords)
    const isImplicitTag = /\(implicit\)|（基底）|（固有）/i.test(line);
    const normalized = normalizeStatLineToEn(line);
    if (!normalized) continue;

    if (afterImplicitsMarker && implicitCountHint !== null) {
      statCandidates.push(normalized);
    } else if (isImplicitTag) {
      implicits.push(normalized);
    } else {
      collectedSections[collectedSections.length - 1]!.push(normalized);
    }
  }

  if (implicitCountHint !== null) {
    for (let i = 0; i < statCandidates.length; i++) {
      if (i < implicitCountHint) {
        implicits.push(statCandidates[i]!);
      } else {
        explicits.push(statCandidates[i]!);
      }
    }
  } else {
    const nonEmptySections = collectedSections.filter((s) => s.length > 0);
    if (nonEmptySections.length >= 2 && implicits.length === 0) {
      // Heuristic: if first mod section has <= 2 lines, treat as implicits and last as explicits
      if (nonEmptySections[0]!.length <= 2) {
        implicits.push(...nonEmptySections[0]!);
        for (let i = 1; i < nonEmptySections.length; i++) {
          explicits.push(...nonEmptySections[i]!);
        }
      } else {
        for (const sec of nonEmptySections) {
          explicits.push(...sec);
        }
      }
    } else {
      for (const sec of nonEmptySections) {
        explicits.push(...sec);
      }
    }
  }

  const inferred = inferSlotAndWeapon(`${itemClassHint} ${baseName} ${name}`);
  let weaponStats: WeaponBaseStats | undefined;
  if (physDamage || aps !== null || critChance !== null) {
    weaponStats = {
      physicalMin: physDamage?.[0] ?? 10,
      physicalMax: physDamage?.[1] ?? 20,
      elementalDamage: Object.keys(eleDamage).length > 0 ? eleDamage : undefined,
      attacksPerSecond: aps ?? 1.2,
      critChance: critChance ?? 6,
      weaponType: inferred.weaponType ?? 'Sword',
      twoHanded: inferred.twoHanded ?? false,
    };
  }

  const isChineseName = /[\u4e00-\u9fff]/.test(name);

  return {
    id: idOverride ?? `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    nameZh: isChineseName ? name : undefined,
    baseName,
    baseNameZh: /[\u4e00-\u9fff]/.test(baseName) ? baseName : undefined,
    rarity,
    slotType: inferred.slotType,
    quality,
    sockets,
    levelReq,
    weaponStats,
    armourStats: hasArmourStats ? armourStats : undefined,
    implicits,
    explicits,
    rawText: trimmed,
  };
}

/**
 * Formats a normalized Item into Path of Building's canonical `<Item>` text format.
 */
export function formatItemToPobText(item: Item): string {
  const lines: string[] = [];
  lines.push(`Rarity: ${item.rarity}`);
  lines.push(item.name);
  if (item.baseName && item.baseName !== item.name) {
    lines.push(item.baseName);
  }
  if (item.quality > 0) {
    lines.push(`Quality: ${item.quality}`);
  }
  if (item.sockets) {
    lines.push(`Sockets: ${item.sockets}`);
  }
  if (item.levelReq) {
    lines.push(`LevelReq: ${item.levelReq}`);
  }
  if (item.armourStats?.armour) {
    lines.push(`Armour: ${item.armourStats.armour}`);
  }
  if (item.armourStats?.evasion) {
    lines.push(`Evasion: ${item.armourStats.evasion}`);
  }
  if (item.armourStats?.energyShield) {
    lines.push(`Energy Shield: ${item.armourStats.energyShield}`);
  }
  if (item.armourStats?.blockChance) {
    lines.push(`Chance to Block: ${item.armourStats.blockChance}%`);
  }
  if (item.weaponStats) {
    lines.push(`Physical Damage: ${item.weaponStats.physicalMin}-${item.weaponStats.physicalMax}`);
    lines.push(`Critical Strike Chance: ${item.weaponStats.critChance}%`);
    lines.push(`Attacks per Second: ${item.weaponStats.attacksPerSecond}`);
  }
  lines.push(`Implicits: ${item.implicits.length}`);
  for (const imp of item.implicits) {
    lines.push(imp);
  }
  for (const exp of item.explicits) {
    lines.push(exp);
  }
  return lines.join('\n');
}
