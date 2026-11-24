import {
  DAMAGE_TYPES,
  KeywordFlag,
  ModFlag,
  type Build,
  type CalcDefenceOutput,
  type CalcOffenceOutput,
  type CalcOutput,
  type DamageRange,
  type DamageType,
  type EquipmentSlotId,
  type GemDefinition,
  type Item,
  type NodePowerDelta,
  type StatBreakdownRow,
} from '@webpob/core';
import {
  findShortestPathToNode,
  getAscendancyStartNodeId,
  getClassDef,
  getGemById,
  getRuleset,
  getTreeForGame,
  removeNodeAndPruneDisconnected,
  UTILITY_FLASK_BUFFS,
} from '@webpob/data';
import { ModDB } from './modDb.js';
import { parseModLines } from './modParser.js';

function getActiveEquippedItems(build: Build): Array<{ slot: EquipmentSlotId; item: Item }> {
  const result: Array<{ slot: EquipmentSlotId; item: Item }> = [];
  const ruleset = getRuleset(build.game);

  for (const slot of ruleset.equipmentSlots) {
    // Handle PoE 2 Weapon Set 1 vs Weapon Set 2 slots cleanly
    if (build.game === 'poe2') {
      if (build.activeWeaponSet === 1 && (slot === 'Weapon 1 Swap' || slot === 'Weapon 2 Swap')) {
        continue;
      }
      if (build.activeWeaponSet === 2 && (slot === 'Weapon 1' || slot === 'Weapon 2')) {
        // Only skip Weapon 1/2 if swap weapon is actually equipped
        const hasSwap = Boolean(build.equipped['Weapon 1 Swap'] || build.equipped['Weapon 2 Swap']);
        if (hasSwap) continue;
      }
    }

    const itemId = build.equipped[slot];
    if (!itemId) continue;
    const item = build.items[itemId];
    if (item) {
      result.push({ slot, item });
    }
  }
  return result;
}

function getActiveWeapon(build: Build): Item | undefined {
  if (build.game === 'poe2' && build.activeWeaponSet === 2 && build.equipped['Weapon 1 Swap']) {
    return build.items[build.equipped['Weapon 1 Swap']!];
  }
  const w1 = build.equipped['Weapon 1'];
  return w1 ? build.items[w1] : undefined;
}

function getLevelScalingFactor(gemLevel: number): number {
  // Smooth realistic scaling anchored at 1.0 for Level 20
  const clamped = Math.max(1, Math.min(30, gemLevel));
  return Math.pow(1.11, clamped - 20);
}

/**
 * Pure TypeScript Path of Building calculation engine.
 * Supports both PoE 1 and PoE 2 via `GameRuleset`, with full stat breakdowns.
 */
export function calculateBuild(build: Build): CalcOutput {
  const ruleset = getRuleset(build.game);
  const classDef = getClassDef(build.game, build.classId);
  const tree = getTreeForGame(build.game);
  const db = new ModDB();
  const warnings: CalcOutput['warnings'] = [];

  // 1. Character base stats & level scaling
  db.addMod({ name: 'Str', type: 'BASE', value: classDef.baseStr, flags: 0, keywordFlags: 0, source: `Class: ${classDef.name.en}` });
  db.addMod({ name: 'Dex', type: 'BASE', value: classDef.baseDex, flags: 0, keywordFlags: 0, source: `Class: ${classDef.name.en}` });
  db.addMod({ name: 'Int', type: 'BASE', value: classDef.baseInt, flags: 0, keywordFlags: 0, source: `Class: ${classDef.name.en}` });

  db.addMod({
    name: 'Life',
    type: 'BASE',
    value: ruleset.baseLife + build.level * ruleset.lifePerLevel + ruleset.campaignLifeFlat,
    flags: 0,
    keywordFlags: 0,
    source: `Level ${build.level}`,
  });
  if (ruleset.campaignLifeIncPct > 0) {
    db.addMod({
      name: 'Life',
      type: 'INC',
      value: ruleset.campaignLifeIncPct,
      flags: 0,
      keywordFlags: 0,
      source: 'Campaign Quest Bonus',
    });
  }
  db.addMod({
    name: 'Mana',
    type: 'BASE',
    value: ruleset.baseMana + build.level * ruleset.manaPerLevel,
    flags: 0,
    keywordFlags: 0,
    source: `Level ${build.level}`,
  });
  if (ruleset.campaignManaIncPct > 0) {
    db.addMod({
      name: 'Mana',
      type: 'INC',
      value: ruleset.campaignManaIncPct,
      flags: 0,
      keywordFlags: 0,
      source: 'Campaign Quest Bonus',
    });
  }
  db.addMod({
    name: 'Evasion',
    type: 'BASE',
    value: ruleset.baseEvasion,
    flags: 0,
    keywordFlags: 0,
    source: 'Base',
  });
  db.addMod({
    name: 'Accuracy',
    type: 'BASE',
    value: build.level * ruleset.accuracyPerLevel,
    flags: 0,
    keywordFlags: 0,
    source: `Level ${build.level}`,
  });
  if (ruleset.supportsSpirit) {
    db.addMod({
      name: 'Spirit',
      type: 'BASE',
      value: ruleset.baseSpirit,
      flags: 0,
      keywordFlags: 0,
      source: 'Campaign Base Spirit',
    });
  }

  // Endgame campaign resistance penalties
  db.addMod({ name: 'FireResist', type: 'BASE', value: ruleset.endgameResistPenalty, flags: 0, keywordFlags: 0, source: 'Campaign Penalty' });
  db.addMod({ name: 'ColdResist', type: 'BASE', value: ruleset.endgameResistPenalty, flags: 0, keywordFlags: 0, source: 'Campaign Penalty' });
  db.addMod({ name: 'LightningResist', type: 'BASE', value: ruleset.endgameResistPenalty, flags: 0, keywordFlags: 0, source: 'Campaign Penalty' });
  if (ruleset.endgameChaosResistPenalty !== 0) {
    db.addMod({ name: 'ChaosResist', type: 'BASE', value: ruleset.endgameChaosResistPenalty, flags: 0, keywordFlags: 0, source: 'Campaign Penalty' });
  }

  // Base max resists & crit multi
  db.addMod({ name: 'FireResistMax', type: 'BASE', value: ruleset.defaultMaxResist, flags: 0, keywordFlags: 0, source: 'Base' });
  db.addMod({ name: 'ColdResistMax', type: 'BASE', value: ruleset.defaultMaxResist, flags: 0, keywordFlags: 0, source: 'Base' });
  db.addMod({ name: 'LightningResistMax', type: 'BASE', value: ruleset.defaultMaxResist, flags: 0, keywordFlags: 0, source: 'Base' });
  db.addMod({ name: 'ChaosResistMax', type: 'BASE', value: ruleset.defaultMaxResist, flags: 0, keywordFlags: 0, source: 'Base' });
  db.addMod({ name: 'CritMultiplier', type: 'BASE', value: ruleset.baseCritMultiplier, flags: 0, keywordFlags: 0, source: 'Base' });
  db.addMod({ name: 'MovementSpeed', type: 'BASE', value: 100, flags: 0, keywordFlags: 0, source: 'Base' });

  // PoE 1 Bandit bonuses
  if (build.game === 'poe1' && build.bandit) {
    if (build.bandit === 'Alira') {
      db.addMods(parseModLines(['+15% to all Elemental Resistances'], 'Bandit: Alira'));
    } else if (build.bandit === 'Oak') {
      db.addMods(parseModLines(['+40 to maximum Life'], 'Bandit: Oak'));
    } else if (build.bandit === 'Kraityn') {
      db.addMods(parseModLines(['8% increased Movement Speed'], 'Bandit: Kraityn'));
    }
  }

  // 2. Passive Skill Tree (Shared + PoE 2 active weapon set nodes)
  const activeTreeNodes = new Set<number>(build.tree.allocatedNodeIds);
  if (ruleset.supportsWeaponSetPassives) {
    const setNodes =
      build.activeWeaponSet === 2
        ? build.tree.weaponSet2NodeIds
        : build.tree.weaponSet1NodeIds;
    for (const id of setNodes) {
      activeTreeNodes.add(id);
    }
  }

  for (const nodeId of activeTreeNodes) {
    const node = tree.nodes[nodeId];
    if (!node) continue;
    db.addMods(parseModLines(node.stats, `Tree: ${node.name.en}`));
  }

  // Mastery effects chosen on PoE 1 mastery nodes
  for (const [nodeIdStr, statText] of Object.entries(build.tree.masteryEffects ?? {})) {
    if (!statText) continue;
    const node = tree.nodes[Number(nodeIdStr)];
    const label = node ? node.name.en : `Mastery ${nodeIdStr}`;
    db.addMods(parseModLines(statText.split('\n'), `Mastery: ${label}`));
  }

  // 3. Equipped Items & Active Utility Flasks
  const equippedItems = getActiveEquippedItems(build);
  for (const { slot, item } of equippedItems) {
    if (slot.startsWith('Flask ')) {
      if (!build.activeFlaskSlots?.[slot]) continue;
      const src = `Flask (${slot}): ${item.name}`;
      const baseBuffs = UTILITY_FLASK_BUFFS[item.baseName];
      if (baseBuffs) {
        db.addMods(parseModLines(baseBuffs, `${src} [Base]`));
      }
      db.addMods(parseModLines(item.implicits, `${src} [Implicit]`));
      db.addMods(parseModLines(item.explicits, src));
      continue;
    }
    const src = `Item (${slot}): ${item.name}`;
    if (item.armourStats?.armour) {
      db.addMod({ name: 'Armour', type: 'BASE', value: item.armourStats.armour, flags: 0, keywordFlags: 0, source: src });
    }
    if (item.armourStats?.evasion) {
      db.addMod({ name: 'Evasion', type: 'BASE', value: item.armourStats.evasion, flags: 0, keywordFlags: 0, source: src });
    }
    if (item.armourStats?.energyShield) {
      db.addMod({ name: 'EnergyShield', type: 'BASE', value: item.armourStats.energyShield, flags: 0, keywordFlags: 0, source: src });
    }
    if (item.armourStats?.blockChance) {
      db.addMod({ name: 'BlockChance', type: 'BASE', value: item.armourStats.blockChance, flags: 0, keywordFlags: 0, source: src });
    }
    db.addMods(parseModLines(item.implicits, `${src} [Implicit]`));
    db.addMods(parseModLines(item.explicits, src));
  }

  // 4. Global Auras & Persistent Spirit Buffs
  let totalManaReservedPct = 0;
  let totalSpiritReserved = 0;
  for (const group of build.skills) {
    if (!group.enabled) continue;
    if (build.game === 'poe2' && group.weaponSets && !group.weaponSets.includes(build.activeWeaponSet)) {
      continue;
    }
    for (const gemInst of group.gems) {
      if (!gemInst.enabled) continue;
      const def = getGemById(build.game, gemInst.gemId);
      if (!def || !def.isAuraOrBuff) continue;
      db.addMods(parseModLines(def.stats, `Aura/Buff: ${def.name.en}`));
      if (def.manaReservationPct) {
        totalManaReservedPct += def.manaReservationPct;
      }
      if (def.spiritReservation) {
        totalSpiritReserved += def.spiritReservation;
      }
    }
  }

  // 5. Build Configuration (Charges, Onslaught, Custom Mods)
  const cfg = build.config;
  if (cfg.usePowerCharges && cfg.powerCharges > 0) {
    // PoE 1: +50% crit chance per Power Charge; PoE 2: +40%
    const perCharge = build.game === 'poe2' ? 40 : 50;
    db.addMod({
      name: 'CritChance',
      type: 'INC',
      value: cfg.powerCharges * perCharge,
      flags: 0,
      keywordFlags: 0,
      source: `Power Charges (${cfg.powerCharges})`,
    });
  }
  if (cfg.useFrenzyCharges && cfg.frenzyCharges > 0) {
    db.addMod({ name: 'Speed', type: 'INC', value: cfg.frenzyCharges * 4, flags: ModFlag.Attack, keywordFlags: 0, source: `Frenzy Charges (${cfg.frenzyCharges})` });
    db.addMod({ name: 'Speed', type: 'INC', value: cfg.frenzyCharges * 4, flags: ModFlag.Spell, keywordFlags: 0, source: `Frenzy Charges (${cfg.frenzyCharges})` });
    db.addMod({ name: 'Damage', type: 'MORE', value: cfg.frenzyCharges * 4, flags: 0, keywordFlags: 0, source: `Frenzy Charges (${cfg.frenzyCharges})` });
  }
  if (cfg.useEnduranceCharges && cfg.enduranceCharges > 0) {
    db.addMod({ name: 'PhysDamageReduction', type: 'BASE', value: cfg.enduranceCharges * 4, flags: 0, keywordFlags: 0, source: `Endurance Charges (${cfg.enduranceCharges})` });
    db.addMod({ name: 'FireResist', type: 'BASE', value: cfg.enduranceCharges * 4, flags: 0, keywordFlags: 0, source: `Endurance Charges (${cfg.enduranceCharges})` });
    db.addMod({ name: 'ColdResist', type: 'BASE', value: cfg.enduranceCharges * 4, flags: 0, keywordFlags: 0, source: `Endurance Charges (${cfg.enduranceCharges})` });
    db.addMod({ name: 'LightningResist', type: 'BASE', value: cfg.enduranceCharges * 4, flags: 0, keywordFlags: 0, source: `Endurance Charges (${cfg.enduranceCharges})` });
  }
  if (cfg.onslaught) {
    db.addMod({ name: 'Speed', type: 'INC', value: 20, flags: ModFlag.Attack, keywordFlags: 0, source: 'Onslaught' });
    db.addMod({ name: 'Speed', type: 'INC', value: 20, flags: ModFlag.Spell, keywordFlags: 0, source: 'Onslaught' });
    db.addMod({ name: 'MovementSpeed', type: 'INC', value: 20, flags: 0, keywordFlags: 0, source: 'Onslaught' });
  }
  if (cfg.customMods.trim()) {
    const customLines = cfg.customMods
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    db.addMods(parseModLines(customLines, 'Custom Modifiers'));
  }

  // 6. Compute Attributes & inject Attribute-derived bonuses per GameRuleset
  const strStat = db.calcStat('Str');
  const dexStat = db.calcStat('Dex');
  const intStat = db.calcStat('Int');
  const str = Math.round(strStat.total);
  const dex = Math.round(dexStat.total);
  const int = Math.round(intStat.total);

  if (ruleset.lifePerStrength > 0) {
    db.addMod({ name: 'Life', type: 'BASE', value: Math.floor(str * ruleset.lifePerStrength), flags: 0, keywordFlags: 0, source: `Strength (${str})` });
  }
  if (ruleset.meleePhysPctPerStrength > 0) {
    db.addMod({ name: 'PhysicalDamage', type: 'INC', value: Math.floor(str * ruleset.meleePhysPctPerStrength), flags: ModFlag.Melee, keywordFlags: 0, source: `Strength (${str})` });
  }
  if (ruleset.accuracyPerDexterity > 0) {
    db.addMod({ name: 'Accuracy', type: 'BASE', value: Math.floor(dex * ruleset.accuracyPerDexterity), flags: 0, keywordFlags: 0, source: `Dexterity (${dex})` });
  }
  if (ruleset.evasionPctPerDexterity > 0) {
    db.addMod({ name: 'Evasion', type: 'INC', value: Math.floor(dex * ruleset.evasionPctPerDexterity), flags: 0, keywordFlags: 0, source: `Dexterity (${dex})` });
  }
  if (ruleset.manaPerIntelligence > 0) {
    db.addMod({ name: 'Mana', type: 'BASE', value: Math.floor(int * ruleset.manaPerIntelligence), flags: 0, keywordFlags: 0, source: `Intelligence (${int})` });
  }
  if (ruleset.esPctPerIntelligence > 0) {
    db.addMod({ name: 'EnergyShield', type: 'INC', value: Math.floor(int * ruleset.esPctPerIntelligence), flags: 0, keywordFlags: 0, source: `Intelligence (${int})` });
  }

  // 7. Compute Defence Output
  const lifeEval = db.calcStat('Life');
  const esEval = db.calcStat('EnergyShield');
  const manaEval = db.calcStat('Mana');
  const spiritEval = db.calcStat('Spirit');
  const armourEval = db.calcStat('Armour');
  const evasionEval = db.calcStat('Evasion');
  const moveSpeedEval = db.calcStat('MovementSpeed');

  const life = Math.round(lifeEval.total);
  const energyShield = Math.round(esEval.total);
  const mana = Math.round(manaEval.total);
  const spirit = ruleset.supportsSpirit ? Math.round(spiritEval.total) : 0;
  const armour = Math.round(armourEval.total);
  const evasion = Math.round(evasionEval.total);

  const manaUnreserved = Math.max(0, Math.round(mana * (1 - totalManaReservedPct / 100)));
  const spiritUnreserved = spirit - totalSpiritReserved;

  if (totalManaReservedPct > 100) {
    warnings.push({
      code: 'OVER_RESERVED_MANA',
      message: {
        en: `Mana reservation (${totalManaReservedPct}%) exceeds 100%.`,
        zh: `魔力保留（${totalManaReservedPct}%）已超过 100%。`,
      },
    });
  }
  if (ruleset.supportsSpirit && spiritUnreserved < 0) {
    warnings.push({
      code: 'OVER_RESERVED_SPIRIT',
      message: {
        en: `Spirit reserved (${totalSpiritReserved}) exceeds total Spirit (${spirit}).`,
        zh: `精魂保留（${totalSpiritReserved}）已超过总精魂上限（${spirit}）。`,
      },
    });
  }

  const fireMaxResist = Math.min(90, Math.round(db.sum('BASE', 'FireResistMax')));
  const coldMaxResist = Math.min(90, Math.round(db.sum('BASE', 'ColdResistMax')));
  const lightningMaxResist = Math.min(90, Math.round(db.sum('BASE', 'LightningResistMax')));
  const chaosMaxResist = Math.min(90, Math.round(db.sum('BASE', 'ChaosResistMax')));

  const fireRaw = Math.round(db.sum('BASE', 'FireResist'));
  const coldRaw = Math.round(db.sum('BASE', 'ColdResist'));
  const lightningRaw = Math.round(db.sum('BASE', 'LightningResist'));
  const chaosImmune = db.flag('ChaosImmune');
  const chaosRaw = chaosImmune ? 100 : Math.round(db.sum('BASE', 'ChaosResist'));

  const fireResist = Math.min(fireMaxResist, fireRaw);
  const coldResist = Math.min(coldMaxResist, coldRaw);
  const lightningResist = Math.min(lightningMaxResist, lightningRaw);
  const chaosResist = chaosImmune ? 100 : Math.min(chaosMaxResist, chaosRaw);

  if (fireResist < 75 || coldResist < 75 || lightningResist < 75) {
    warnings.push({
      code: 'UNCAPPED_RESISTS',
      message: {
        en: `Elemental resistances are not capped (Fire ${fireResist}% / Cold ${coldResist}% / Light ${lightningResist}%).`,
        zh: `元素抗性未满 75%（火 ${fireResist}% / 冰 ${coldResist}% / 雷 ${lightningResist}%）。`,
      },
    });
  }

  // Armour Phys Damage Reduction against a standard enemy hit (1500 phys hit baseline)
  const referencePhysHit = 1500;
  const armourMit = armour > 0 ? (armour / (armour + ruleset.armourFormulaFactor * referencePhysHit)) * 100 : 0;
  const flatPdr = db.sum('BASE', 'PhysDamageReduction');
  const physDamageReduction = Math.min(90, Math.round((armourMit + flatPdr) * 10) / 10);

  // Evasion chance against level-scaled enemy accuracy
  const enemyAcc = 200 + cfg.enemyLevel * 12;
  const evadeChance =
    evasion > 0
      ? Math.min(95, Math.max(0, Math.round((1 - (1.25 * enemyAcc) / (enemyAcc + Math.pow(evasion / 5, 0.9))) * 100)))
      : 0;

  const blockChance = Math.min(ruleset.maxBlockChance, Math.round(db.sum('BASE', 'BlockChance')));
  const spellBlockChance = Math.min(ruleset.maxBlockChance, Math.round(db.sum('BASE', 'SpellBlockChance')));
  const spellSuppressionChance = ruleset.supportsSpellSuppression
    ? Math.min(100, Math.round(db.sum('BASE', 'SpellSuppressionChance')))
    : 0;

  const lifeRegen =
    Math.round((db.sum('BASE', 'LifeRegen') + (life * db.sum('BASE', 'LifeRegenPercent')) / 100) * 10) / 10;
  const manaRegen = Math.round(mana * 0.0175 * 10) / 10;

  // Effective Hit Pool & Max Hit Taken
  const momPct = Math.min(100, db.sum('BASE', 'DamageTakenFromManaBeforeLife'));
  const effectiveManaBuffer = momPct > 0 ? Math.min(manaUnreserved, Math.round((life * momPct) / (100 - momPct + 0.01))) : 0;
  const totalPool = life + energyShield + effectiveManaBuffer;

  const avgEleRes = (fireResist + coldResist + lightningResist) / 3;
  const eleTakenFactor = Math.max(0.1, 1 - avgEleRes / 100);
  const physTakenFactor = Math.max(0.1, 1 - physDamageReduction / 100);
  const avoidanceFactor = Math.max(0.15, (1 - evadeChance / 100) * (1 - blockChance / 100));

  const maxPhysHitTaken = Math.round(totalPool / physTakenFactor);
  const maxEleHitTaken = Math.round(totalPool / eleTakenFactor);
  const effectiveHitPool = Math.round((totalPool / ((physTakenFactor + eleTakenFactor) / 2)) / avoidanceFactor);

  const defence: CalcDefenceOutput = {
    str,
    dex,
    int,
    life,
    lifeUnreserved: life,
    lifeRegen,
    energyShield,
    esRegen: 0,
    mana,
    manaUnreserved,
    manaRegen,
    spirit,
    spiritReserved: totalSpiritReserved,
    spiritUnreserved,
    armour,
    physDamageReduction,
    evasion,
    evadeChance,
    blockChance,
    spellBlockChance,
    spellSuppressionChance,
    fireResist,
    fireResistOvercap: Math.max(0, fireRaw - fireMaxResist),
    fireMaxResist,
    coldResist,
    coldResistOvercap: Math.max(0, coldRaw - coldMaxResist),
    coldMaxResist,
    lightningResist,
    lightningResistOvercap: Math.max(0, lightningRaw - lightningMaxResist),
    lightningMaxResist,
    chaosResist,
    chaosResistOvercap: chaosImmune ? 0 : Math.max(0, chaosRaw - chaosMaxResist),
    chaosMaxResist,
    movementSpeedPct: Math.round(moveSpeedEval.total),
    effectiveHitPool,
    maxPhysHitTaken,
    maxEleHitTaken,
  };

  // 8. Compute Offence Output for Main Skill Group
  const offence = computeOffence(build, db, defence);

  // 9. Build transparent Calcs Breakdown rows
  const breakdowns: StatBreakdownRow[] = [
    { label: 'Maximum Life', labelZh: '最大生命', ...lifeEval, total: life },
    { label: 'Maximum Energy Shield', labelZh: '最大能量护盾', ...esEval, total: energyShield },
    { label: 'Maximum Mana', labelZh: '最大魔力', ...manaEval, total: mana },
    ...(ruleset.supportsSpirit
      ? [{ label: 'Spirit', labelZh: '精魂', ...spiritEval, total: spirit }]
      : []),
    { label: 'Armour', labelZh: '护甲', ...armourEval, total: armour },
    { label: 'Evasion Rating', labelZh: '闪避值', ...evasionEval, total: evasion },
    { label: 'Strength', labelZh: '力量', ...strStat, total: str },
    { label: 'Dexterity', labelZh: '敏捷', ...dexStat, total: dex },
    { label: 'Intelligence', labelZh: '智慧', ...intStat, total: int },
    { label: 'Movement Speed (%)', labelZh: '移动速度 (%)', ...moveSpeedEval, total: defence.movementSpeedPct },
    ...(momPct > 0
      ? [
          {
            label: 'Mind Over Matter (%)',
            labelZh: '心灵升华魔力承伤 (%)',
            ...db.calcStat('DamageTakenFromManaBeforeLife'),
            total: momPct,
          },
        ]
      : []),
  ];

  // Exclude start node and ascendancy nodes from main passive point count (just like PoB)
  const startNodeId = tree.classStartNodeIds[build.classId];
  const ascStartNodeId = getAscendancyStartNodeId(tree, build.ascendancyId);
  const allocatedPoints = build.tree.allocatedNodeIds.filter((id) => {
    if (id === startNodeId) return false;
    const node = tree.nodes[id];
    return !node?.ascendancyId;
  }).length;
  const ascendancyPoints = build.tree.allocatedNodeIds.filter((id) => {
    if (id === ascStartNodeId) return false;
    const node = tree.nodes[id];
    return Boolean(node?.ascendancyId);
  }).length;

  return {
    game: build.game,
    offence,
    defence,
    breakdowns,
    allocatedPoints,
    ascendancyPoints,
    weaponSet1Points: build.tree.weaponSet1NodeIds.length,
    weaponSet2Points: build.tree.weaponSet2NodeIds.length,
    warnings,
  };
}

function resolveGemLevelEntry(def: GemDefinition, level: number) {
  if (!def.levelScaling || level === 20) return undefined;
  if (def.levelScaling[level]) return def.levelScaling[level];
  // Interpolate smoothly between the nearest exported level breakpoints (including Lv.20 base)
  const keys = Object.keys(def.levelScaling)
    .map(Number)
    .concat([20])
    .sort((a, b) => a - b);
  let low = keys[0]!;
  let high = keys[keys.length - 1]!;
  for (const k of keys) {
    if (k <= level) low = k;
    if (k >= level) {
      high = k;
      break;
    }
  }
  const getEntry = (lv: number) =>
    lv === 20
      ? {
          baseDamage: def.baseDamage,
          attackDamageMultiplierPct: def.attackDamageMultiplierPct,
          damageEffectivenessPct: def.damageEffectivenessPct,
          manaCost: def.manaCost,
          stats: def.stats,
        }
      : def.levelScaling![lv];
  const lowE = getEntry(low);
  const highE = getEntry(high);
  if (!lowE || !highE || low === high) return lowE ?? highE;
  const t = (level - low) / (high - low);
  let baseDamage: Partial<Record<DamageType, [number, number]>> | undefined;
  if (lowE.baseDamage && highE.baseDamage) {
    baseDamage = {};
    for (const dt of DAMAGE_TYPES) {
      const a = lowE.baseDamage[dt];
      const b = highE.baseDamage[dt];
      if (a && b) {
        // Exponential interpolation closely tracks PoE's skill damage curve
        const mn = a[0] > 0 && b[0] > 0 ? a[0] * Math.pow(b[0] / a[0], t) : a[0] + (b[0] - a[0]) * t;
        const mx = a[1] > 0 && b[1] > 0 ? a[1] * Math.pow(b[1] / a[1], t) : a[1] + (b[1] - a[1]) * t;
        baseDamage[dt] = [Math.round(mn), Math.round(mx)];
      }
    }
  }
  return {
    baseDamage,
    attackDamageMultiplierPct:
      lowE.attackDamageMultiplierPct !== undefined && highE.attackDamageMultiplierPct !== undefined
        ? Math.round((lowE.attackDamageMultiplierPct + (highE.attackDamageMultiplierPct - lowE.attackDamageMultiplierPct) * t) * 10) / 10
        : lowE.attackDamageMultiplierPct,
    damageEffectivenessPct:
      lowE.damageEffectivenessPct !== undefined && highE.damageEffectivenessPct !== undefined
        ? Math.round((lowE.damageEffectivenessPct + (highE.damageEffectivenessPct - lowE.damageEffectivenessPct) * t) * 10) / 10
        : lowE.damageEffectivenessPct,
    manaCost:
      lowE.manaCost !== undefined && highE.manaCost !== undefined
        ? Math.round(lowE.manaCost + (highE.manaCost - lowE.manaCost) * t)
        : lowE.manaCost,
    stats: t < 0.5 ? lowE.stats : highE.stats,
  };
}

function computeOffence(build: Build, globalDb: ModDB, _defence: CalcDefenceOutput): CalcOffenceOutput {
  const emptyRanges: Record<DamageType, DamageRange> = {
    Physical: { min: 0, max: 0, average: 0 },
    Lightning: { min: 0, max: 0, average: 0 },
    Cold: { min: 0, max: 0, average: 0 },
    Fire: { min: 0, max: 0, average: 0 },
    Chaos: { min: 0, max: 0, average: 0 },
  };

  const mainGroup =
    build.skills.find((g) => g.id === build.mainSkillGroupId && g.enabled) ??
    build.skills.find((g) => g.enabled);

  if (!mainGroup) {
    return {
      mainSkillName: { en: 'No Active Skill', zh: '未选择主动技能' },
      skillType: 'None',
      damageByType: emptyRanges,
      averageHit: 0,
      speed: 0,
      critChance: 0,
      critMultiplier: 150,
      hitChance: 100,
      effectiveCritMultiplier: 1,
      hitDps: 0,
      igniteDps: 0,
      bleedDps: 0,
      poisonDps: 0,
      totalDps: 0,
      manaCost: 0,
      manaPerSecond: 0,
    };
  }

  let activeDef: GemDefinition | undefined;
  let activeLevel = 20;
  let activeQuality = 0;
  const skillDb = globalDb.clone();

  // PoE 1 3.30 Matching Socket Quality Bonus (+10% quality when gem color matches socket color of slot item)
  let slotDefaultSocketColor: 'red' | 'green' | 'blue' | undefined;
  if (build.game === 'poe1' && mainGroup.slot) {
    const slotItemId = build.equipped[mainGroup.slot];
    const slotItem = slotItemId ? build.items[slotItemId] : undefined;
    if (slotItem?.armourStats) {
      const a = slotItem.armourStats.armour ?? 0;
      const e = slotItem.armourStats.evasion ?? 0;
      const es = slotItem.armourStats.energyShield ?? 0;
      if (es > 0 && a === 0 && e === 0) slotDefaultSocketColor = 'blue';
      else if (a > 0 && e === 0 && es === 0) slotDefaultSocketColor = 'red';
      else if (e > 0 && a === 0 && es === 0) slotDefaultSocketColor = 'green';
    } else if (slotItem?.weaponStats) {
      const wt = slotItem.weaponStats.weaponType;
      if (wt === 'Wand' || wt === 'Staff') slotDefaultSocketColor = 'blue';
      else if (wt === 'Bow' || wt === 'Claw' || wt === 'Dagger') slotDefaultSocketColor = 'green';
      else if (wt === 'Axe' || wt === 'Mace') slotDefaultSocketColor = 'red';
    }
  }

  const applyGemQualityStats = (def: GemDefinition, rawQuality: number, sourcePrefix: string) => {
    const socketBonus =
      build.game === 'poe1' && slotDefaultSocketColor && def.color === slotDefaultSocketColor ? 10 : 0;
    const effectiveQuality = rawQuality + socketBonus;
    if (effectiveQuality <= 0) return effectiveQuality;
    if (def.qualityStats) {
      for (const qs of def.qualityStats) {
        const val = Math.trunc(effectiveQuality * qs.perQuality);
        if (val !== 0) {
          const line = qs.template.replace('{v}', String(val));
          skillDb.addMods(parseModLines([line], `${sourcePrefix}: ${def.name.en} (Q${effectiveQuality})`));
        }
      }
    } else if (def.category === 'active' && rawQuality > 0) {
      // Fallback for uncurated active gems without explicit qualityStats
      const val = Math.trunc(rawQuality * 0.5);
      if (val > 0) {
        skillDb.addMod({
          name: 'Damage',
          type: 'INC',
          value: val,
          flags: 0,
          keywordFlags: 0,
          source: `${def.name.en} Quality`,
        });
      }
    }
    return effectiveQuality;
  };

  for (const gemInst of mainGroup.gems) {
    if (!gemInst.enabled) continue;
    const def = getGemById(build.game, gemInst.gemId);
    if (!def) continue;
    const levelEntry = resolveGemLevelEntry(def, gemInst.level);
    const effectiveStats = levelEntry?.stats ?? def.stats;
    if (def.category === 'active' && !def.isAuraOrBuff && !activeDef) {
      activeDef = def;
      activeLevel = gemInst.level;
      activeQuality = applyGemQualityStats(def, gemInst.quality, 'Skill');
      skillDb.addMods(parseModLines(effectiveStats, `Skill: ${def.name.en}`));
    } else if (def.category === 'support') {
      skillDb.addMods(parseModLines(effectiveStats, `Support: ${def.name.en}`));
      applyGemQualityStats(def, gemInst.quality, 'Support');
    }
  }

  if (!activeDef) {
    return {
      mainSkillName: { en: 'No Active Skill', zh: '未选择主动技能' },
      skillType: 'None',
      damageByType: emptyRanges,
      averageHit: 0,
      speed: 0,
      critChance: 0,
      critMultiplier: 150,
      hitChance: 100,
      effectiveCritMultiplier: 1,
      hitDps: 0,
      igniteDps: 0,
      bleedDps: 0,
      poisonDps: 0,
      totalDps: 0,
      manaCost: 0,
      manaPerSecond: 0,
    };
  }

  const isAttack = (activeDef.modFlags & ModFlag.Attack) !== 0;
  const flags = activeDef.modFlags;
  const kwFlags = activeDef.keywordFlags;
  const activeLevelEntry = resolveGemLevelEntry(activeDef, activeLevel);
  const levelFactor = activeLevelEntry ? 1 : getLevelScalingFactor(activeLevel);
  void activeQuality;

  const effectiveness =
    ((activeLevelEntry?.damageEffectivenessPct ?? activeDef.damageEffectivenessPct ?? 100) / 100);
  const weapon = getActiveWeapon(build);

  // Step A: Base Min/Max per DamageType before conversion
  const baseMin: Record<DamageType, number> = { Physical: 0, Lightning: 0, Cold: 0, Fire: 0, Chaos: 0 };
  const baseMax: Record<DamageType, number> = { Physical: 0, Lightning: 0, Cold: 0, Fire: 0, Chaos: 0 };

  if (isAttack) {
    const baseAtkPct = activeLevelEntry?.attackDamageMultiplierPct ?? activeDef.attackDamageMultiplierPct ?? 100;
    const atkMult = activeLevelEntry ? baseAtkPct / 100 : (baseAtkPct / 100) * Math.pow(1.03, activeLevel - 20);
    const wMin = weapon?.weaponStats?.physicalMin ?? 15;
    const wMax = weapon?.weaponStats?.physicalMax ?? 30;
    baseMin.Physical += wMin * atkMult;
    baseMax.Physical += wMax * atkMult;
    if (weapon?.weaponStats?.elementalDamage) {
      for (const [el, range] of Object.entries(weapon.weaponStats.elementalDamage)) {
        if (!range) continue;
        const dt = el as DamageType;
        baseMin[dt] += range[0] * atkMult;
        baseMax[dt] += range[1] * atkMult;
      }
    }
  } else if (activeLevelEntry?.baseDamage ?? activeDef.baseDamage) {
    const srcDmg = activeLevelEntry?.baseDamage ?? activeDef.baseDamage!;
    for (const dt of DAMAGE_TYPES) {
      const range = srcDmg[dt];
      if (range) {
        baseMin[dt] += range[0] * levelFactor;
        baseMax[dt] += range[1] * levelFactor;
      }
    }
  }

  // Add flat damage modifiers scaled by effectiveness
  for (const dt of DAMAGE_TYPES) {
    const addMin = skillDb.sum('BASE', `${dt}Min`, flags, kwFlags);
    const addMax = skillDb.sum('BASE', `${dt}Max`, flags, kwFlags);
    baseMin[dt] += addMin * effectiveness;
    baseMax[dt] += addMax * effectiveness;
  }

  // Step B: Physical Conversion & Gained-as-Extra
  const convFire = skillDb.sum('BASE', 'PhysicalDamageConvertToFire', flags, kwFlags);
  const convCold = skillDb.sum('BASE', 'PhysicalDamageConvertToCold', flags, kwFlags);
  const convLight = skillDb.sum('BASE', 'PhysicalDamageConvertToLightning', flags, kwFlags);
  const convChaos = skillDb.sum('BASE', 'PhysicalDamageConvertToChaos', flags, kwFlags);
  const convSum = convFire + convCold + convLight + convChaos;
  const convScale = convSum > 100 ? 100 / convSum : 1;

  const physOrigMin = baseMin.Physical;
  const physOrigMax = baseMax.Physical;

  const finalBaseMin = { ...baseMin };
  const finalBaseMax = { ...baseMax };

  if (convSum > 0) {
    const fracFire = (convFire * convScale) / 100;
    const fracCold = (convCold * convScale) / 100;
    const fracLight = (convLight * convScale) / 100;
    const fracChaos = (convChaos * convScale) / 100;
    const remainingPhys = Math.max(0, 1 - (fracFire + fracCold + fracLight + fracChaos));

    finalBaseMin.Physical = physOrigMin * remainingPhys;
    finalBaseMax.Physical = physOrigMax * remainingPhys;
    finalBaseMin.Fire += physOrigMin * fracFire;
    finalBaseMax.Fire += physOrigMax * fracFire;
    finalBaseMin.Cold += physOrigMin * fracCold;
    finalBaseMax.Cold += physOrigMax * fracCold;
    finalBaseMin.Lightning += physOrigMin * fracLight;
    finalBaseMax.Lightning += physOrigMax * fracLight;
    finalBaseMin.Chaos += physOrigMin * fracChaos;
    finalBaseMax.Chaos += physOrigMax * fracChaos;
  }

  // Gain Physical as Extra Elemental/Chaos
  for (const target of ['Fire', 'Cold', 'Lightning', 'Chaos'] as const) {
    const extraPct = skillDb.sum('BASE', `PhysicalDamageGainAs${target}`, flags, kwFlags);
    if (extraPct > 0) {
      finalBaseMin[target] += physOrigMin * (extraPct / 100);
      finalBaseMax[target] += physOrigMax * (extraPct / 100);
    }
  }
  const eleExtraChaos = skillDb.sum('BASE', 'ElementalDamageGainAsChaos', flags, kwFlags);
  if (eleExtraChaos > 0) {
    const eleMin = finalBaseMin.Fire + finalBaseMin.Cold + finalBaseMin.Lightning;
    const eleMax = finalBaseMax.Fire + finalBaseMax.Cold + finalBaseMax.Lightning;
    finalBaseMin.Chaos += eleMin * (eleExtraChaos / 100);
    finalBaseMax.Chaos += eleMax * (eleExtraChaos / 100);
  }

  // Step C: Apply Increased & More multipliers + Enemy Resistances / Penetration + Shock
  const enemyBossResistBonus =
    build.config.enemyIsBoss === 'Pinnacle' ? 20 : build.config.enemyIsBoss === 'Guardian' ? 10 : 0;

  const shockMult = build.config.enemyShocked ? 1 + Math.max(0, Math.min(100, build.config.shockValue)) / 100 : 1;

  const ruleset = getRuleset(build.game);
  const damageByType: Record<DamageType, DamageRange> = { ...emptyRanges };
  const dealNoEle = skillDb.flag('DealNoElemental', flags, kwFlags);
  const dealNoChaos = skillDb.flag('DealNoChaos', flags, kwFlags);
  let totalAvgHit = 0;

  for (const dt of DAMAGE_TYPES) {
    const isEle = dt === 'Fire' || dt === 'Cold' || dt === 'Lightning';
    if ((isEle && dealNoEle) || (dt === 'Chaos' && dealNoChaos)) {
      damageByType[dt] = { min: 0, max: 0, average: 0 };
      continue;
    }
    const statNames = isEle ? ['Damage', 'ElementalDamage', `${dt}Damage`] : ['Damage', `${dt}Damage`];

    const inc = skillDb.sum('INC', statNames, flags, kwFlags);
    const more = skillDb.more(statNames, flags, kwFlags);

    const preMitMult = (1 + inc / 100) * more;
    const rawMin = finalBaseMin[dt] * preMitMult;
    const rawMax = finalBaseMax[dt] * preMitMult;
    const rawAvg = (rawMin + rawMax) / 2;

    // Enemy mitigation (Resistances + Penetration for Ele/Chaos; Enemy Armour PDR capped at 75% for Physical)
    let enemyFactor = 1;
    if (dt === 'Physical') {
      const eArm = Math.max(0, build.config.enemyArmour);
      if (eArm > 0 && rawAvg > 0) {
        const pdr = Math.min(0.75, eArm / (eArm + ruleset.armourFormulaFactor * rawAvg));
        enemyFactor = 1 - pdr;
      }
    } else if (dt === 'Fire') {
      const effRes = Math.min(75, build.config.enemyFireResist + enemyBossResistBonus) - skillDb.sum('BASE', 'FirePenetration', flags, kwFlags);
      enemyFactor = 1 - effRes / 100;
    } else if (dt === 'Cold') {
      const effRes = Math.min(75, build.config.enemyColdResist + enemyBossResistBonus) - skillDb.sum('BASE', 'ColdPenetration', flags, kwFlags);
      enemyFactor = 1 - effRes / 100;
    } else if (dt === 'Lightning') {
      const effRes = Math.min(75, build.config.enemyLightningResist + enemyBossResistBonus) - skillDb.sum('BASE', 'LightningPenetration', flags, kwFlags);
      enemyFactor = 1 - effRes / 100;
    } else if (dt === 'Chaos') {
      const effRes = Math.min(75, build.config.enemyChaosResist + enemyBossResistBonus / 2);
      enemyFactor = 1 - effRes / 100;
    }

    const finalMult = Math.max(0.05, enemyFactor) * shockMult;
    const min = rawMin * finalMult;
    const max = rawMax * finalMult;
    const average = (min + max) / 2;
    damageByType[dt] = { min: Math.round(min), max: Math.round(max), average: Math.round(average * 100) / 100 };
    totalAvgHit += average;
  }

  // Step D: Accuracy / Hit Chance first (exact PoB formula: acc / (acc + (eva/5)^0.9) * 125)
  let hitChance = 100;
  if (isAttack && !skillDb.flag('HitsCantBeEvaded', flags, kwFlags)) {
    const accuracy = Math.max(1, skillDb.calcStat('Accuracy', flags, kwFlags).total);
    const enemyEva = Math.max(1, build.config.enemyEvasion);
    hitChance = Math.min(
      100,
      Math.max(5, Math.round((accuracy / (accuracy + Math.pow(enemyEva / 5, 0.9))) * 125)),
    );
  }

  // Step E: Crit Chance & Crit Multiplier (including Attack crit confirmation roll = crit * hitChance)
  const neverCrit = skillDb.flag('NeverCrit', flags, kwFlags);
  const baseCrit = isAttack ? (weapon?.weaponStats?.critChance ?? 5) : (activeDef.baseCritChance ?? 6);
  const critInc = skillDb.sum('INC', 'CritChance', flags, kwFlags);
  const critMore = skillDb.more('CritChance', flags, kwFlags);
  const preEffectiveCrit = neverCrit ? 0 : Math.min(100, baseCrit * (1 + critInc / 100) * critMore);
  const critChance = Math.round(preEffectiveCrit * (isAttack ? hitChance / 100 : 1) * 100) / 100;
  const critMultiplier = neverCrit ? 0 : Math.round(skillDb.sum('BASE', 'CritMultiplier', flags, kwFlags));
  const effectiveCritMultiplier = neverCrit
    ? 1
    : 1 + (critChance / 100) * Math.max(0, critMultiplier / 100 - 1);

  // Step F: Attack / Cast Speed
  const baseRate = isAttack
    ? (weapon?.weaponStats?.attacksPerSecond ?? 1.2) * (activeDef.attackSpeedMultiplier ?? 1)
    : 1 / (activeDef.castTime ?? 0.75);
  const speedInc = skillDb.sum('INC', 'Speed', flags, kwFlags);
  const speedMore = skillDb.more('Speed', flags, kwFlags);
  const speedExact = baseRate * (1 + speedInc / 100) * speedMore;
  const speed = Math.round(speedExact * 100) / 100;

  const avgHitWithCrit = Math.round(totalAvgHit * effectiveCritMultiplier * 100) / 100;
  const hitDps = Math.round(avgHitWithCrit * speedExact * (hitChance / 100) * 100) / 100;

  // Ailment DPS (Ignite / Bleed / Poison) with DoT Multiplier & Crit Ailment bonus
  const dotMulti = skillDb.sum('BASE', 'DotMultiplier', flags, kwFlags);
  const dotInc = skillDb.sum('INC', 'DotDamage', flags, kwFlags);
  const dotMore = skillDb.more('DotDamage', flags, kwFlags);

  const igniteChance = Math.min(100, skillDb.sum('BASE', 'IgniteChance', flags, kwFlags));
  const hasIgnite =
    damageByType.Fire.average > 0 &&
    ((kwFlags & KeywordFlag.Ignite) !== 0 || igniteChance > 0 || critChance > 0);
  let igniteDps = 0;
  if (hasIgnite) {
    const fireDotMulti = dotMulti + skillDb.sum('BASE', 'FireDotMultiplier', flags, kwFlags);
    const igniteInc = dotInc + skillDb.sum('INC', 'IgniteDamage', flags, kwFlags);
    const igniteMore = dotMore * skillDb.more('IgniteDamage', flags, kwFlags);
    const baseIgnite = damageByType.Fire.average * 0.9 * (1 + igniteInc / 100) * igniteMore;
    const nonCritIgnite = baseIgnite * (1 + fireDotMulti / 100);
    // Crits always ignite with +50% DoT Multiplier for Ailments from Critical Strikes
    const critIgnite = baseIgnite * (1 + (fireDotMulti + 50) / 100);
    const baseChanceFrac = Math.min(1, ((kwFlags & KeywordFlag.Ignite) !== 0 ? Math.max(25, igniteChance) : igniteChance) / 100);
    const critFrac = critChance / 100;
    const effIgniteChance = critFrac + (1 - critFrac) * baseChanceFrac;
    const critShare = effIgniteChance > 0 ? Math.min(1, (critFrac / effIgniteChance) * 1.9) : 0;
    igniteDps = Math.round(nonCritIgnite * (1 - critShare) + critIgnite * critShare);
  }

  const bleedChance = Math.min(100, skillDb.sum('BASE', 'BleedChance', flags, kwFlags));
  let bleedDps = 0;
  if (isAttack && damageByType.Physical.average > 0 && bleedChance > 0) {
    const physDotMulti = dotMulti + skillDb.sum('BASE', 'PhysicalDotMultiplier', flags, kwFlags);
    bleedDps = Math.round(
      damageByType.Physical.average * 0.7 * (1 + dotInc / 100) * dotMore * (1 + physDotMulti / 100),
    );
  }

  const poisonChance = Math.min(100, skillDb.sum('BASE', 'PoisonChance', flags, kwFlags));
  let poisonDps = 0;
  if (poisonChance > 0 && damageByType.Physical.average + damageByType.Chaos.average > 0) {
    const chaosDotMulti = dotMulti + skillDb.sum('BASE', 'ChaosDotMultiplier', flags, kwFlags);
    const singlePoison =
      (damageByType.Physical.average + damageByType.Chaos.average) *
      0.3 *
      (1 + dotInc / 100) *
      dotMore *
      (1 + chaosDotMulti / 100);
    const activeStacks = speedExact * (hitChance / 100) * (poisonChance / 100) * 2.0; // 2s base duration
    poisonDps = Math.round(singlePoison * activeStacks);
  }

  const totalDps = Math.round((hitDps + igniteDps + bleedDps + poisonDps) * 100) / 100;
  const manaCost = activeDef.manaCost ?? 15;
  const manaPerSecond = Math.round(manaCost * speed * 10) / 10;

  return {
    mainSkillName: activeDef.name,
    skillType: isAttack ? 'Attack' : 'Spell',
    damageByType,
    averageHit: avgHitWithCrit,
    speed,
    critChance,
    critMultiplier,
    hitChance,
    effectiveCritMultiplier: Math.round(effectiveCritMultiplier * 100) / 100,
    hitDps,
    igniteDps,
    bleedDps,
    poisonDps,
    totalDps,
    manaCost,
    manaPerSecond,
  };
}

/**
 * Simulates toggling a passive skill node (allocating shortest path or removing+pruning)
 * to compute live `NodePowerDelta` (`ΔDPS`, `ΔLife`, `ΔES`, `ΔEHP`) for tree hover tooltips.
 */
export function computeNodePower(
  build: Build,
  nodeId: number,
  baseline?: CalcOutput,
): NodePowerDelta {
  const baseOut = baseline ?? calculateBuild(build);
  const tree = getTreeForGame(build.game);
  const startNodeId = tree.classStartNodeIds[build.classId] ?? build.tree.allocatedNodeIds[0] ?? 0;
  const ascStartNodeId = getAscendancyStartNodeId(tree, build.ascendancyId);
  const rootIds = ascStartNodeId ? [startNodeId, ascStartNodeId] : [startNodeId];

  const allAllocated = new Set<number>([
    ...build.tree.allocatedNodeIds,
    ...(build.game === 'poe2'
      ? build.activeWeaponSet === 2
        ? build.tree.weaponSet2NodeIds
        : build.tree.weaponSet1NodeIds
      : []),
  ]);

  const isAllocated = allAllocated.has(nodeId);
  let simulatedBuild: Build;

  if (isAllocated) {
    if (rootIds.includes(nodeId)) {
      return { nodeId, isAllocated: true, dpsDelta: 0, dpsDeltaPct: 0, lifeDelta: 0, esDelta: 0, ehpDelta: 0 };
    }
    const pruned = removeNodeAndPruneDisconnected(tree, [...allAllocated], rootIds, nodeId);
    simulatedBuild = {
      ...build,
      tree: {
        ...build.tree,
        allocatedNodeIds: pruned,
        weaponSet1NodeIds: build.tree.weaponSet1NodeIds.filter((id) => pruned.includes(id)),
        weaponSet2NodeIds: build.tree.weaponSet2NodeIds.filter((id) => pruned.includes(id)),
      },
    };
  } else {
    const path = findShortestPathToNode(tree, allAllocated, nodeId);
    if (path.length === 0) {
      return { nodeId, isAllocated: false, dpsDelta: 0, dpsDeltaPct: 0, lifeDelta: 0, esDelta: 0, ehpDelta: 0 };
    }
    simulatedBuild = {
      ...build,
      tree: {
        ...build.tree,
        allocatedNodeIds: [...build.tree.allocatedNodeIds, ...path],
      },
    };
  }

  const nextOut = calculateBuild(simulatedBuild);
  const dpsDelta = nextOut.offence.totalDps - baseOut.offence.totalDps;
  const dpsDeltaPct =
    baseOut.offence.totalDps > 0
      ? Math.round((dpsDelta / baseOut.offence.totalDps) * 1000) / 10
      : 0;

  return {
    nodeId,
    isAllocated,
    dpsDelta,
    dpsDeltaPct,
    lifeDelta: nextOut.defence.life - baseOut.defence.life,
    esDelta: nextOut.defence.energyShield - baseOut.defence.energyShield,
    ehpDelta: nextOut.defence.effectiveHitPool - baseOut.defence.effectiveHitPool,
  };
}
