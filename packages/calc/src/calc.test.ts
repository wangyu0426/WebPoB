import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createSamplePoe1Build,
  createSamplePoe2Build,
  hydrateCompactTree,
  registerTreeData,
  registerUniques,
  type CompactTreePayload,
  type CompactUniquesPayload,
} from '@webpob/data';
import {
  analyzeBuildDiagnostics,
  calculateBuild,
  computeNodePower,
  parseModLine,
  rankSupportGemsForGroup,
  rankUniqueUpgradesForSlot,
} from './index.js';
import { localizeStatLine, normalizeStatLineToEn } from '@webpob/i18n';

describe('@webpob/calc', () => {
  it('calculates PoE 1 sample Elementalist Arc build with coherent offence and defence', () => {
    const build = createSamplePoe1Build();
    const out = calculateBuild(build);

    expect(out.game).toBe('poe1');
    expect(out.offence.skillType).toBe('Spell');
    expect(out.offence.totalDps).toBeGreaterThan(20000);
    expect(out.offence.critChance).toBeGreaterThan(15);
    expect(out.defence.life).toBeGreaterThan(2200);
    expect(out.defence.energyShield).toBeGreaterThan(1000);
    expect(out.defence.fireResist).toBe(75);
    expect(out.defence.spirit).toBe(0);
    expect(out.breakdowns.length).toBeGreaterThan(5);
  });

  it('calculates PoE 2 sample Stormweaver Spark with Spirit pool & Weapon Set switching', () => {
    const build = createSamplePoe2Build();
    const set1 = calculateBuild({ ...build, activeWeaponSet: 1 });
    const set2 = calculateBuild({ ...build, activeWeaponSet: 2 });

    expect(set1.game).toBe('poe2');
    expect(set1.defence.spirit).toBeGreaterThanOrEqual(190);
    expect(set1.defence.spiritReserved).toBe(130); // Archmage (100) + Grim Feast (30)
    expect(set1.defence.spiritUnreserved).toBe(set1.defence.spirit - 130);
    // Weapon Set 1 has Lightning Rod + Wand/Focus; Set 2 has Crit passives + Quarterstaff swap
    expect(set1.offence.totalDps).not.toBe(set2.offence.totalDps);
  });

  it('produces identical calculation outputs for Chinese and English custom modifiers', () => {
    const base = createSamplePoe1Build();
    const enBuild = {
      ...base,
      config: {
        ...base.config,
        customMods: '+120 to maximum Life\n40% increased Lightning Damage\n+20% to Global Critical Strike Multiplier',
      },
    };
    const zhBuild = {
      ...base,
      config: {
        ...base.config,
        customMods: '最大生命 +120\n闪电伤害提高 40%\n全局暴击伤害加成 +20%',
      },
    };

    const enOut = calculateBuild(enBuild);
    const zhOut = calculateBuild(zhBuild);
    const baseOut = calculateBuild(base);

    expect(enOut.defence.life).toBeGreaterThan(baseOut.defence.life);
    expect(enOut.offence.totalDps).toBeGreaterThan(baseOut.offence.totalDps);
    expect(zhOut.defence.life).toBe(enOut.defence.life);
    expect(zhOut.offence.totalDps).toBe(enOut.offence.totalDps);
  });

  it('applies Chaos Inoculation keystone accurately (Life=1, ChaosRes=100%)', () => {
    const base = createSamplePoe1Build();
    const ciBuild = {
      ...base,
      tree: {
        ...base.tree,
        allocatedNodeIds: [...base.tree.allocatedNodeIds, 3108], // Chaos Inoculation
      },
    };
    const out = calculateBuild(ciBuild);
    expect(out.defence.life).toBe(1);
    expect(out.defence.chaosResist).toBe(100);
  });

  it('computes live NodePower delta for unallocated notable nodes', () => {
    const build = createSamplePoe1Build();
    const delta = computeNodePower(build, 3205); // Elemental Focus
    expect(delta.isAllocated).toBe(false);
    expect(delta.dpsDelta).toBeGreaterThan(0);
    expect(delta.dpsDeltaPct).toBeGreaterThan(0);
  });

  it('hydrates and calculates official full PoE 1 (3.30) & PoE 2 (0.5) passive trees', () => {
    const poe1Path = path.resolve(process.cwd(), 'apps/web/public/data/poe1-tree-3_30.json');
    const poe2Path = path.resolve(process.cwd(), 'apps/web/public/data/poe2-tree-0_5.json');

    const poe1Tree = hydrateCompactTree(JSON.parse(fs.readFileSync(poe1Path, 'utf-8')) as CompactTreePayload);
    const poe2Tree = hydrateCompactTree(JSON.parse(fs.readFileSync(poe2Path, 'utf-8')) as CompactTreePayload);

    expect(Object.keys(poe1Tree.nodes).length).toBeGreaterThan(2500);
    expect(Object.keys(poe2Tree.nodes).length).toBeGreaterThan(4000);

    registerTreeData(poe1Tree);
    registerTreeData(poe2Tree);

    const officialPoe1 = createSamplePoe1Build();
    const officialPoe2 = createSamplePoe2Build();
    expect(officialPoe1.tree.treeVersion).toBe('3_30');
    expect(officialPoe2.tree.treeVersion).toBe('0_5');

    const out1 = calculateBuild(officialPoe1);
    const out2 = calculateBuild(officialPoe2);
    expect(out1.offence.totalDps).toBeGreaterThan(15000);
    expect(out2.offence.totalDps).toBeGreaterThan(2500);
    expect(out1.allocatedPoints).toBe(officialPoe1.tree.allocatedNodeIds.length - 1);
  });

  it('ranks compatible Support Gems by descending Total DPS gain for a Skill Group', () => {
    const build = createSamplePoe1Build();
    const ranked = rankSupportGemsForGroup(build, build.mainSkillGroupId, 5);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0]!.dpsDelta).toBeGreaterThan(0);
    expect(ranked[0]!.dpsDeltaPct).toBeGreaterThan(0);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.dpsDelta).toBeGreaterThanOrEqual(ranked[i]!.dpsDelta);
    }
  });

  it('ranks compatible official Unique Items by descending DPS/EHP upgrade delta', () => {
    const dataDir = path.join(process.cwd(), 'apps/web/public/data');
    const uniquesPayload = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'poe1-uniques.json'), 'utf-8'),
    ) as CompactUniquesPayload;
    registerUniques(uniquesPayload);
    const build = createSamplePoe1Build();
    delete build.equipped['Amulet'];
    const rankedDps = rankUniqueUpgradesForSlot(build, 'Amulet', 'dps', 5);
    expect(rankedDps.length).toBeGreaterThan(0);
    expect(rankedDps[0]!.dpsDelta).toBeGreaterThan(0);
    for (let i = 1; i < rankedDps.length; i++) {
      expect(rankedDps[i - 1]!.dpsDelta).toBeGreaterThanOrEqual(rankedDps[i]!.dpsDelta);
    }
  });

  it('scales active skill and aura gem levels from English & Chinese +Gem Level mods', () => {
    const base = createSamplePoe1Build();
    const baseOut = calculateBuild(base);
    const boostedEn = calculateBuild({
      ...base,
      config: {
        ...base.config,
        customMods: '+1 to Level of all Skill Gems\n+2 to Level of all Lightning Spell Skill Gems',
      },
    });
    const boostedZh = calculateBuild({
      ...base,
      config: {
        ...base.config,
        customMods: '所有技能宝石等级 +1\n所有闪电法术技能等级 +2',
      },
    });
    expect(boostedEn.offence.mainSkillLevel).toBe(23);
    expect(boostedEn.offence.mainSkillBaseLevel).toBe(20);
    expect(boostedEn.offence.totalDps).toBeGreaterThan(baseOut.offence.totalDps * 1.25);
    expect(boostedZh.offence.mainSkillLevel).toBe(boostedEn.offence.mainSkillLevel);
    expect(boostedZh.offence.totalDps).toBe(boostedEn.offence.totalDps);
  });

  it('analyzes build diagnostics and surfaces actionable optimization warnings', () => {
    const build = createSamplePoe1Build();
    // Remove body armour + helmet to trigger uncapped resistances & low hit pool
    delete build.equipped['Body Armour'];
    delete build.equipped['Helmet'];
    const out = calculateBuild(build);
    const diags = analyzeBuildDiagnostics(build, out);
    expect(diags.some((d) => d.id === 'uncapped_ele_res')).toBe(true);
    expect(diags.some((d) => d.id === 'negative_chaos_res')).toBe(true);
  });

  it('applies +all max ele res, Inquisitor Inevitable Judgement, Eldritch Battery, and Enemy Blinded', () => {
    const base = createSamplePoe1Build();
    const baseOut = calculateBuild({
      ...base,
      config: {
        ...base.config,
        enemyIsBoss: 'Pinnacle',
        enemyLightningResist: 75,
        customMods: '+100% to all Elemental Resistances',
      },
    });
    const maxResOut = calculateBuild({
      ...base,
      config: {
        ...base.config,
        enemyIsBoss: 'Pinnacle',
        enemyLightningResist: 75,
        customMods: '+100% to all Elemental Resistances\n+5% to all maximum Elemental Resistances',
      },
    });
    expect(maxResOut.defence.fireResist).toBe(80);
    expect(maxResOut.defence.coldResist).toBe(80);
    expect(maxResOut.defence.lightningResist).toBe(80);

    const inqOut = calculateBuild({
      ...base,
      config: {
        ...base.config,
        enemyIsBoss: 'Pinnacle',
        enemyLightningResist: 75,
        customMods:
          'Critical Strikes ignore Enemy Monster Elemental Resistances\nNon-Critical Strikes Penetrate 10% of Enemy Elemental Resistances\n1% increased Critical Strike Chance per point of Strength or Intelligence, whichever is lower',
      },
    });
    expect(inqOut.offence.critChance).toBeGreaterThan(baseOut.offence.critChance);
    expect(inqOut.offence.totalDps).toBeGreaterThan(baseOut.offence.totalDps * 1.15);

    const ebOut = calculateBuild({
      ...base,
      config: {
        ...base.config,
        enemyBlinded: true,
        customMods: 'Energy Shield protects Mana instead of Life',
      },
    });
    expect(ebOut.defence.effectiveHitPool).toBeLessThan(baseOut.defence.effectiveHitPool);
    expect(ebOut.defence.evadeChance).toBeGreaterThanOrEqual(baseOut.defence.evadeChance);
  });

  it('applies Berserker Aspect of Carnage + Crave the Slaughter, Slayer Overwhelm, and Iron Will', () => {
    const base = createSamplePoe1Build();
    const baseOut = calculateBuild(base);

    // Aspect of Carnage: 40% more Damage & 10% increased Damage taken
    const carnageOut = calculateBuild({
      ...base,
      config: {
        ...base.config,
        customMods: '40% more Damage\n10% increased Damage taken',
      },
    });
    expect(carnageOut.offence.totalDps).toBeCloseTo(baseOut.offence.totalDps * 1.4, -1);
    expect(carnageOut.defence.effectiveHitPool).toBeLessThan(baseOut.defence.effectiveHitPool);

    // Iron Will: Strength grants Spell Damage (floor(str * 0.2)%)
    const iwOut = calculateBuild({
      ...base,
      config: {
        ...base.config,
        customMods: "+500 to Strength\nStrength's Damage bonus applies to all Spell Damage as well",
      },
    });
    const strOnlyOut = calculateBuild({
      ...base,
      config: {
        ...base.config,
        customMods: '+500 to Strength',
      },
    });
    expect(iwOut.offence.totalDps).toBeGreaterThan(strOnlyOut.offence.totalDps * 1.15);
  });

  it('parses flat base critical strike chance identically from English & Chinese mods', () => {
    const base = createSamplePoe1Build();
    const baseOut = calculateBuild(base);
    const enOut = calculateBuild({
      ...base,
      config: { ...base.config, customMods: 'Hits have +1.5% to Critical Strike Chance' },
    });
    const zhOut = calculateBuild({
      ...base,
      config: { ...base.config, customMods: '击中基础暴击率 +1.5%' },
    });

    expect(enOut.offence.critChance).toBeGreaterThan(baseOut.offence.critChance);
    expect(zhOut.offence.critChance).toBe(enOut.offence.critChance);
    expect(parseModLine('Hits have +1.5% to Critical Strike Chance', 'Test')).toEqual([
      expect.objectContaining({ name: 'BaseCritChance', type: 'BASE', value: 1.5 }),
    ]);
    expect(parseModLine('+1.5% to Critical Strike Chance', 'Test')).toEqual([
      expect.objectContaining({ name: 'BaseCritChance', type: 'BASE', value: 1.5 }),
    ]);
  });

  it('applies Juggernaut Body Armour doubling and Armour-to-elemental hit mitigation', () => {
    const base = createSamplePoe1Build();
    const bodyItem = base.items['preset_poe1_body_inpulsa']!;
    const armouredBody = {
      ...bodyItem,
      armourStats: { armour: 1000, evasion: 540, energyShield: 165 },
    };
    const armouredBuild = {
      ...base,
      items: { ...base.items, test_armoured_body: armouredBody },
      equipped: { ...base.equipped, 'Body Armour': 'test_armoured_body' },
    };
    const armouredOut = calculateBuild(armouredBuild);
    const doubledOut = calculateBuild({
      ...armouredBuild,
      config: { ...armouredBuild.config, customMods: 'Armour from Equipped Body Armour is doubled' },
    });
    const flatArmourOut = calculateBuild({
      ...armouredBuild,
      config: { ...armouredBuild.config, customMods: '+1000 to Armour' },
    });
    expect(doubledOut.defence.armour).toBe(flatArmourOut.defence.armour);
    expect(doubledOut.defence.armour).toBeGreaterThan(armouredOut.defence.armour);

    const mitigatedOut = calculateBuild({
      ...armouredBuild,
      config: {
        ...armouredBuild.config,
        customMods: '8% of Armour applies to Fire, Cold and Lightning Damage taken from Hits',
      },
    });
    expect(mitigatedOut.defence.maxEleHitTaken).toBeGreaterThan(armouredOut.defence.maxEleHitTaken);
    expect(mitigatedOut.defence.effectiveHitPool).toBeGreaterThan(armouredOut.defence.effectiveHitPool);
  });

  it('applies Trickster Polymath and Escape Artist conversions', () => {
    const base = createSamplePoe1Build();
    const baseOut = calculateBuild(base);
    const masteries = { ...base.tree, masteryEffects: { 1001: '', 1002: '', 1003: '' } };
    const noPolyOut = calculateBuild({ ...base, tree: masteries });
    const polyOut = calculateBuild({
      ...base,
      tree: masteries,
      config: {
        ...base.config,
        customMods: '3% more Damage for each different type of Mastery you have Allocated',
      },
    });
    expect(polyOut.offence.totalDps / noPolyOut.offence.totalDps).toBeCloseTo(1.09, 2);

    const escapeOut = calculateBuild({
      ...base,
      config: {
        ...base.config,
        customMods:
          '+1 to Maximum Energy Shield per 5 Evasion Rating on Equipped Body Armour\n+1 to Evasion Rating per 5 Maximum Energy Shield on Equipped Helmet',
      },
    });
    expect(escapeOut.defence.energyShield).toBeGreaterThan(baseOut.defence.energyShield);
    expect(escapeOut.defence.evasion).toBeGreaterThan(baseOut.defence.evasion);
    const esRow = escapeOut.breakdowns.find((row) => row.label === 'Maximum Energy Shield');
    const evasionRow = escapeOut.breakdowns.find((row) => row.label === 'Evasion Rating');
    expect(esRow?.sources).toContainEqual(
      expect.objectContaining({ source: 'Escape Artist (Body Armour Evasion)', value: 108 }),
    );
    expect(evasionRow?.sources).toContainEqual(
      expect.objectContaining({ source: 'Escape Artist (Helmet Energy Shield)', value: 53 }),
    );
  });

  it('normalizes Phase 17 bilingual endgame rules and max charge modifiers', () => {
    const pairs: Array<[string, string]> = [
      ['击中基础暴击率 +1.5%', 'Hits have +1.5% to Critical Strike Chance'],
      ['装备的胸甲提供的护甲翻倍', 'Armour from Equipped Body Armour is doubled'],
      [
        '护甲值的 8% 同样作用于承受的火焰、冰霜和闪电击中伤害',
        '8% of Armour applies to Fire, Cold and Lightning Damage taken from Hits',
      ],
      ['最大暴击球数量 +1', '+1 to Maximum Power Charges'],
      ['最大狂怒球数量 +2', '+2 to Maximum Frenzy Charges'],
      ['最大耐力球数量 +3', '+3 to Maximum Endurance Charges'],
    ];
    for (const [zh, en] of pairs) {
      expect(normalizeStatLineToEn(zh)).toBe(en);
      expect(localizeStatLine(en, 'zh-CN')).toBe(zh);
    }
    const maxCharges = parseModLine('最大暴击球数量 +1', 'Test');
    expect(maxCharges).toEqual([
      expect.objectContaining({ name: 'PowerChargesMax', type: 'BASE', value: 1 }),
    ]);
  });

  it('scales Wrath damage and Discipline Energy Shield with Aura Effect (EN & ZH)', () => {
    const base = createSamplePoe1Build();
    const helmetAuras = {
      ...base,
      skills: base.skills.map((group) =>
        group.id === 'sg_auras'
          ? {
              ...group,
              gems: [
                { instanceId: 'a1', gemId: 'poe1_wrath', level: 20, quality: 0, enabled: true },
                { instanceId: 'a2', gemId: 'poe1_discipline', level: 20, quality: 0, enabled: true },
              ],
            }
          : group,
      ),
    };
    const baseOut = calculateBuild(helmetAuras);
    const enOut = calculateBuild({
      ...helmetAuras,
      config: {
        ...helmetAuras.config,
        customMods: '50% increased effect of Non-Curse Auras from your Skills',
      },
    });
    const zhOut = calculateBuild({
      ...helmetAuras,
      config: { ...helmetAuras.config, customMods: '非诅咒光环效果提高 50%' },
    });

    expect(enOut.offence.totalDps).toBeGreaterThan(baseOut.offence.totalDps);
    expect(enOut.defence.energyShield).toBeGreaterThan(baseOut.defence.energyShield);
    const disciplineSource = enOut.breakdowns
      .find((row) => row.label === 'Maximum Energy Shield')
      ?.sources.filter((source) => source.source === 'Aura/Buff: Discipline');
    expect(disciplineSource?.map((source) => source.value)).toEqual([325]);
    expect(zhOut.offence.totalDps).toBe(enOut.offence.totalDps);
    expect(zhOut.defence.energyShield).toBe(enOut.defence.energyShield);
  });

  it('scales curse resistance reduction and damage with Curse Effect (EN & ZH)', () => {
    const base = createSamplePoe1Build();
    const cursed = {
      ...base,
      skills: base.skills.map((group) =>
        group.id === 'sg_auras'
          ? {
              ...group,
              gems: [{ instanceId: 'c1', gemId: 'poe1_conductivity', level: 20, quality: 0, enabled: true }],
            }
          : group,
      ),
    };
    const baseOut = calculateBuild(cursed);
    const enOut = calculateBuild({
      ...cursed,
      config: { ...cursed.config, customMods: '50% increased Effect of your Curses' },
    });
    const zhOut = calculateBuild({
      ...cursed,
      config: { ...cursed.config, customMods: '诅咒效果提高 50%' },
    });

    expect(enOut.offence.totalDps).toBeGreaterThan(baseOut.offence.totalDps);
    expect(zhOut.offence.totalDps).toBe(enOut.offence.totalDps);
    expect(enOut.offence.damageByType.Lightning.average).toBeGreaterThan(
      baseOut.offence.damageByType.Lightning.average,
    );
    expect(parseModLine('50% increased Effect of your Curses', 'Test')).toEqual([
      expect.objectContaining({ name: 'CurseEffect', type: 'INC', value: 50 }),
    ]);
  });

  it('runs the Lightning -> Cold -> Fire conversion chain for Arc', () => {
    const base = createSamplePoe1Build();
    const baseOut = calculateBuild(base);
    const convertedOut = calculateBuild({
      ...base,
      config: {
        ...base.config,
        customMods:
          '40% of Lightning Damage Converted to Cold Damage\n50% of Cold Damage Converted to Fire Damage',
      },
    });

    expect(convertedOut.offence.damageByType.Lightning.average).toBeLessThan(
      baseOut.offence.damageByType.Lightning.average,
    );
    expect(convertedOut.offence.damageByType.Cold.average).toBeGreaterThan(0);
    expect(convertedOut.offence.damageByType.Fire.average).toBeGreaterThan(
      baseOut.offence.damageByType.Fire.average,
    );
    expect(convertedOut.offence.damageByType.Chaos.average).toBe(
      baseOut.offence.damageByType.Chaos.average,
    );
  });

  it('adds Molten Shell, Steelskin and Arcane Cloak guard pools and Arcane Cloak Lightning damage', () => {
    const base = createSamplePoe1Build();
    const baseOut = calculateBuild(base);
    const bodyItem = base.items['preset_poe1_body_inpulsa']!;
    const armouredBuild = {
      ...base,
      items: {
        ...base.items,
        test_guard_body: { ...bodyItem, armourStats: { armour: 2000, evasion: 540, energyShield: 165 } },
      },
      equipped: { ...base.equipped, 'Body Armour': 'test_guard_body' },
    };
    const armouredOut = calculateBuild(armouredBuild);
    const moltenOut = calculateBuild({
      ...armouredBuild,
      config: { ...armouredBuild.config, activeGuardSkill: 'MoltenShell' },
    });
    const steelskinOut = calculateBuild({
      ...base,
      config: { ...base.config, activeGuardSkill: 'Steelskin' },
    });
    expect(moltenOut.defence.effectiveHitPool).toBeGreaterThan(armouredOut.defence.effectiveHitPool);
    expect(moltenOut.defence.maxPhysHitTaken).toBeGreaterThan(armouredOut.defence.maxPhysHitTaken);
    expect(steelskinOut.defence.effectiveHitPool).toBeGreaterThan(baseOut.defence.effectiveHitPool);
    expect(steelskinOut.defence.maxPhysHitTaken).toBeGreaterThan(baseOut.defence.maxPhysHitTaken);

    const cloakOut = calculateBuild({
      ...base,
      config: { ...base.config, activeGuardSkill: 'ArcaneCloak' },
    });
    expect(cloakOut.defence.effectiveHitPool).toBeGreaterThan(baseOut.defence.effectiveHitPool);
    expect(cloakOut.offence.totalDps).toBeGreaterThan(baseOut.offence.totalDps);
    expect(cloakOut.offence.damageByType.Lightning.average).toBeGreaterThan(
      baseOut.offence.damageByType.Lightning.average,
    );
  });

  it('normalizes Phase 18 aura, curse and conversion rules bidirectionally', () => {
    const pairs: Array<[string, string]> = [
      ['非诅咒光环效果提高 50%', '50% increased effect of Non-Curse Auras from your Skills'],
      ['诅咒效果提高 50%', '50% increased Effect of your Curses'],
      ['40% 闪电伤害转化为冰霜伤害', '40% of Lightning Damage Converted to Cold Damage'],
      ['50% 冰霜伤害转化为火焰伤害', '50% of Cold Damage Converted to Fire Damage'],
      ['30% 火焰伤害转化为混沌伤害', '30% of Fire Damage Converted to Chaos Damage'],
    ];
    for (const [zh, en] of pairs) {
      expect(normalizeStatLineToEn(zh)).toBe(en);
      expect(localizeStatLine(en, 'zh-CN')).toBe(zh);
    }
    expect(parseModLine('40% of Lightning Damage Converted to Cold Damage', 'Test')).toEqual([
      expect.objectContaining({ name: 'LightningDamageConvertToCold', type: 'BASE', value: 40 }),
    ]);
    expect(parseModLine('30% of Fire Damage Converted to Chaos Damage', 'Test')).toEqual([
      expect.objectContaining({ name: 'FireDamageConvertToChaos', type: 'BASE', value: 30 }),
    ]);
  });

  it('scales damage and crit multiplier with Power Charges (EN & ZH identical)', () => {
    const base = createSamplePoe1Build();
    const sixCharges = { ...base.config, usePowerCharges: true, powerCharges: 6 };
    const chargeOut = calculateBuild({
      ...base,
      config: {
        ...sixCharges,
        customMods:
          '25% increased Spell Damage per Power Charge\n+10% to Critical Strike Multiplier per Power Charge',
      },
    });
    const zhChargeOut = calculateBuild({
      ...base,
      config: {
        ...sixCharges,
        customMods: '每个暴击球使法术伤害提高 25%\n每个暴击球提供 +10% 暴击伤害加成',
      },
    });
    const sixChargeBase = calculateBuild({ ...base, config: sixCharges });
    const flatEquivalent = calculateBuild({
      ...base,
      config: {
        ...sixCharges,
        customMods: '150% increased Spell Damage\n+60% to Global Critical Strike Multiplier',
      },
    });

    // 6 Power Charges * 25% = 150% increased Spell Damage, and 6 * 10% = +60% crit multi.
    expect(chargeOut.offence.totalDps).toBe(flatEquivalent.offence.totalDps);
    expect(chargeOut.offence.critMultiplier).toBe(sixChargeBase.offence.critMultiplier + 60);
    expect(zhChargeOut.offence.totalDps).toBe(chargeOut.offence.totalDps);
    expect(zhChargeOut.offence.critMultiplier).toBe(chargeOut.offence.critMultiplier);
    expect(parseModLine('25% increased Spell Damage per Power Charge', 'Test')).toEqual([
      expect.objectContaining({ name: 'DamagePerPowerCharge', type: 'BASE', value: 25, flags: 2 }),
    ]);
    expect(parseModLine('8% increased Attack Speed per Frenzy Charge', 'Test')).toEqual([
      expect.objectContaining({ name: 'SpeedPerFrenzyCharge', type: 'BASE', value: 8, flags: 1 }),
    ]);
  });

  it('injects attribute-scaling damage per Intelligence (EN & ZH identical)', () => {
    const base = createSamplePoe1Build();
    const baseOut = calculateBuild(base);
    const perTenInt = Math.floor(baseOut.defence.int / 10);
    const attrOut = calculateBuild({
      ...base,
      config: { ...base.config, customMods: '1% increased Spell Damage per 10 Intelligence' },
    });
    const zhAttrOut = calculateBuild({
      ...base,
      config: { ...base.config, customMods: '每 10 点智慧使法术伤害提高 1%' },
    });
    const flatEquivalent = calculateBuild({
      ...base,
      config: { ...base.config, customMods: `${perTenInt}% increased Spell Damage` },
    });

    expect(perTenInt).toBeGreaterThan(0);
    expect(attrOut.offence.totalDps).toBeGreaterThan(baseOut.offence.totalDps);
    expect(attrOut.offence.totalDps).toBe(flatEquivalent.offence.totalDps);
    expect(zhAttrOut.offence.totalDps).toBe(attrOut.offence.totalDps);
    expect(parseModLine('1% increased Spell Damage per 10 Intelligence', 'Test')).toEqual([
      expect.objectContaining({
        name: 'DamagePerAttr:Intelligence:spell',
        type: 'BASE',
        value: 0.1,
        flags: 2,
      }),
    ]);
  });

  it('applies flat Physical Damage Reduction and Shakari Pantheon chaos resistance', () => {
    const base = createSamplePoe1Build();
    const baseOut = calculateBuild(base);
    const pdrOut = calculateBuild({
      ...base,
      config: { ...base.config, customMods: '+8% additional Physical Damage Reduction' },
    });
    expect(pdrOut.defence.physDamageReduction).toBeCloseTo(baseOut.defence.physDamageReduction + 8, 1);
    expect(pdrOut.defence.maxPhysHitTaken).toBeGreaterThan(baseOut.defence.maxPhysHitTaken);

    const shakariOut = calculateBuild({
      ...base,
      config: { ...base.config, pantheonMinor: 'Shakari' },
    });
    expect(shakariOut.defence.chaosResist).toBe(baseOut.defence.chaosResist + 5);

    const solarisOut = calculateBuild({
      ...base,
      config: { ...base.config, pantheonMajor: 'Solaris' },
    });
    expect(solarisOut.defence.physDamageReduction).toBeCloseTo(
      baseOut.defence.physDamageReduction + 6,
      1,
    );

    expect(parseModLine('+8% additional Physical Damage Reduction', 'Test')).toEqual([
      expect.objectContaining({ name: 'PhysDamageReduction', type: 'BASE', value: 8 }),
    ]);
  });

  it('computes realistic capped life and Energy Shield leech rates', () => {
    const base = createSamplePoe1Build();
    const baseOut = calculateBuild(base);
    const leechOut = calculateBuild({
      ...base,
      config: { ...base.config, customMods: '1% of Damage Leeched as Life' },
    });
    const cap = baseOut.defence.life * 0.2;
    expect(leechOut.defence.lifeLeechRate).toBe(Math.round(cap));
    expect(leechOut.defence.lifeLeechRate).toBeLessThan(baseOut.offence.hitDps * 0.01);

    const increasedCapOut = calculateBuild({
      ...base,
      config: {
        ...base.config,
        customMods:
          '1% of Damage Leeched as Life\n100% increased Maximum total Life Recovery per second from Leech',
      },
    });
    const rawLife = increasedCapOut.offence.hitDps * 0.01;
    const doubledCap = increasedCapOut.defence.life * 0.2 * 2;
    expect(increasedCapOut.defence.lifeLeechRate).toBe(Math.round(Math.min(rawLife, doubledCap)));
    expect(increasedCapOut.defence.lifeLeechRate).toBeGreaterThan(leechOut.defence.lifeLeechRate!);

    const esLeechOut = calculateBuild({
      ...base,
      config: { ...base.config, customMods: '1% of Damage Leeched as Energy Shield' },
    });
    const rawEs = esLeechOut.offence.hitDps * 0.01;
    const esCap = esLeechOut.defence.energyShield * 0.1;
    expect(esLeechOut.defence.esLeechRate).toBe(Math.round(Math.min(rawEs, esCap)));
    expect(parseModLine('1% of Damage Leeched as Life', 'Test')).toEqual([
      expect.objectContaining({ name: 'LifeLeech', type: 'BASE', value: 1 }),
    ]);
  });

  it('normalizes Phase 19 pantheon, charge, attribute and leech rules bidirectionally', () => {
    const pairs: Array<[string, string]> = [
      ['额外物理伤害减免 +8%', '+8% additional Physical Damage Reduction'],
      ['每个暴击球使法术伤害提高 25%', '25% increased Spell Damage per Power Charge'],
      ['每个狂怒球使伤害提高 4%', '4% increased Damage per Frenzy Charge'],
      ['每个耐力球使伤害提高 3%', '3% increased Damage per Endurance Charge'],
      ['每个暴击球提供 +10% 暴击伤害加成', '+10% to Critical Strike Multiplier per Power Charge'],
      ['每 10 点智慧使法术伤害提高 1%', '1% increased Spell Damage per 10 Intelligence'],
      ['每 10 点力量使攻击伤害提高 2%', '2% increased Attack Damage per 10 Strength'],
      ['每 5 点敏捷使伤害提高 1%', '1% increased Damage per 5 Dexterity'],
      ['伤害的 1% 偷取为生命', '1% of Damage Leeched as Life'],
      ['伤害的 0.5% 偷取为能量护盾', '0.5% of Damage Leeched as Energy Shield'],
      ['伤害的 2% 偷取为魔力', '2% of Damage Leeched as Mana'],
    ];
    for (const [zh, en] of pairs) {
      expect(normalizeStatLineToEn(zh)).toBe(en);
      expect(localizeStatLine(en, 'zh-CN')).toBe(zh);
    }
  });
});
