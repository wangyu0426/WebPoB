import { describe, expect, it } from 'vitest';
import { createSamplePoe1Build, createSamplePoe2Build } from '@webpob/data';
import {
  encodeBuildToPobCode,
  importBuildFromCode,
  parseCharacterJsonToBuild,
  parseItemText,
  resolveShareUrl,
} from './index.js';

describe('@webpob/codec', () => {
  it('round-trips a PoE 1 Build through official Base64URL+zlib PoB share code', () => {
    const original = createSamplePoe1Build();
    const code = encodeBuildToPobCode(original);
    expect(code.length).toBeGreaterThan(50);

    const { build: decoded, xml } = importBuildFromCode(code);
    expect(xml).toContain('<PathOfBuilding>');
    expect(decoded.game).toBe('poe1');
    expect(decoded.level).toBe(original.level);
    expect(decoded.classId).toBe(original.classId);
    expect(decoded.ascendancyId).toBe(original.ascendancyId);
    expect(decoded.tree.allocatedNodeIds).toEqual(original.tree.allocatedNodeIds);
    expect(decoded.skills.length).toBe(original.skills.length);
    expect(Object.keys(decoded.equipped).length).toBe(Object.keys(original.equipped).length);
  });

  it('round-trips a PoE 2 Build including weaponSet passives and skill weaponSets', () => {
    const original = createSamplePoe2Build();
    const code = encodeBuildToPobCode(original);
    const { build: decoded, xml } = importBuildFromCode(code);

    expect(xml).toContain('<PathOfBuilding2>');
    expect(decoded.game).toBe('poe2');
    expect(decoded.classId).toBe('Sorceress');
    expect(decoded.tree.weaponSet1NodeIds).toEqual(original.tree.weaponSet1NodeIds);
    expect(decoded.tree.weaponSet2NodeIds).toEqual(original.tree.weaponSet2NodeIds);
  });

  it('parses English and Chinese in-game Ctrl+C items into identical canonical mods', () => {
    const enItemText = `Item Class: Body Armours
Rarity: Rare
Astral Shell
Vaal Regalia
--------
Quality: +20% (augmented)
Energy Shield: 520 (augmented)
--------
+88 to maximum Life
+42% to Fire Resistance
+36% to Lightning Resistance
24% increased Spell Damage`;

    const zhItemText = `物品类别: 胸甲
稀有度: 稀有
星界护壳
瓦尔法衣
--------
品质: +20%（已增强）
能量护盾: 520（已增强）
--------
最大生命 +88
火焰抗性 +42%
闪电抗性 +36%
法术伤害提高 24%`;

    const enItem = parseItemText(enItemText);
    const zhItem = parseItemText(zhItemText);

    expect(enItem).not.toBeNull();
    expect(zhItem).not.toBeNull();
    expect(enItem!.slotType).toBe('Body Armour');
    expect(zhItem!.slotType).toBe('Body Armour');
    expect(enItem!.armourStats?.energyShield).toBe(520);
    expect(zhItem!.armourStats?.energyShield).toBe(520);
    expect(zhItem!.explicits).toEqual(enItem!.explicits);
  });

  it('resolves pobb.in and pastebin URLs to raw endpoints', () => {
    expect(resolveShareUrl('https://pobb.in/AbCd1234')).toBe('https://pobb.in/AbCd1234/raw');
    expect(resolveShareUrl('https://pastebin.com/XyZ987')).toBe('https://pastebin.com/raw/XyZ987');
  });

  it('imports GGG/Tencent character JSON (passives + items + socketed gems) into a Build', () => {
    const imported = parseCharacterJsonToBuild({
      game: 'poe1',
      passivesJson: {
        hashes: [54447, 57264, 37569],
      },
      itemsJson: {
        character: { name: 'StormWitch', class: 'Elementalist', level: 94, league: 'Settlers' },
        items: [
          {
            id: 'chest1',
            name: 'Astral Vestment',
            baseType: 'Vaal Regalia',
            inventoryId: 'BodyArmour',
            frameType: 2,
            properties: [{ name: 'Quality', values: [['+20%', 1]] }],
            explicitMods: ['+100 to maximum Life', '+40% to Fire Resistance'],
            socketedItems: [
              { baseType: 'Arc', properties: [{ name: 'Level', values: [['21', 0]] }, { name: 'Quality', values: [['+20%', 1]] }] },
              { baseType: 'Controlled Destruction Support', support: true, properties: [{ name: 'Level', values: [['20', 0]] }] },
            ],
          },
        ],
      },
    });
    expect(imported.name).toBe('StormWitch');
    expect(imported.classId).toBe('Witch');
    expect(imported.ascendancyId).toBe('Elementalist');
    expect(imported.level).toBe(94);
    expect(imported.tree.allocatedNodeIds).toContain(57264);
    expect(imported.equipped['Body Armour']).toBeDefined();
    expect(imported.skills.length).toBe(1);
    expect(imported.skills[0]!.gems.length).toBe(2);
    expect(imported.skills[0]!.gems[0]!.level).toBe(21);
  });

  it('round-trips multiple Tree Specs and multiple Item Sets through PoB XML', () => {
    const base = createSamplePoe1Build();
    const spec2 = {
      ...base.tree,
      title: 'Endgame Lv.95',
      allocatedNodeIds: base.tree.allocatedNodeIds.slice(0, 5),
    };
    const set2 = {
      id: '2',
      title: 'Bossing Gear',
      equipped: { 'Weapon 1': base.equipped['Weapon 1'] },
    };
    const multiBuild = {
      ...base,
      tree: spec2,
      treeSpecs: [base.tree, spec2],
      activeTreeSpecIndex: 1,
      equipped: set2.equipped,
      itemSets: [
        { id: '1', title: 'Mapping', equipped: base.equipped, activeFlaskSlots: base.activeFlaskSlots },
        set2,
      ],
      activeItemSetIndex: 1,
    };

    const code = encodeBuildToPobCode(multiBuild);
    const { build: decoded, xml } = importBuildFromCode(code);
    expect(xml).toContain('<Tree activeSpec="2">');
    expect(xml).toContain('<Items activeItemSet="2">');
    expect(decoded.treeSpecs?.length).toBe(2);
    expect(decoded.activeTreeSpecIndex).toBe(1);
    expect(decoded.tree.title).toBe('Endgame Lv.95');
    expect(decoded.tree.allocatedNodeIds).toEqual(spec2.allocatedNodeIds);
    expect(decoded.itemSets?.length).toBe(2);
    expect(decoded.activeItemSetIndex).toBe(1);
    expect(Object.keys(decoded.equipped)).toEqual(['Weapon 1']);
  });
});
