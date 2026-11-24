import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createSamplePoe1Build,
  createSamplePoe2Build,
  hydrateCompactTree,
  registerTreeData,
  type CompactTreePayload,
} from '@webpob/data';
import { calculateBuild, computeNodePower } from './index.js';

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
    expect(out2.offence.totalDps).toBeGreaterThan(10000);
    expect(out1.allocatedPoints).toBe(officialPoe1.tree.allocatedNodeIds.length - 1);
  });
});
