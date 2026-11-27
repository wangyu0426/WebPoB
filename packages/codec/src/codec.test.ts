import { describe, expect, it } from 'vitest';
import { createSamplePoe1Build, createSamplePoe2Build } from '@webpob/data';
import {
  buildToPobXml,
  encodeBuildToPobCode,
  fetchRemoteBuildCode,
  importBuildFromCode,
  parseCharacterJsonToBuild,
  parseItemText,
  parsePoeNinjaCharacterUrl,
  resolveShareUrl,
  xmlToBuild,
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

    const zhTwItemText = `物品種類: 胸甲
稀有度: 稀有
星界護殼
瓦爾法衣
--------
品質: +20% (augmented)
能量護盾: 520 (augmented)
--------
最大生命 +88
火焰抗性 +42%
閃電抗性 +36%
增加 24% 法術傷害`;

    const enItem = parseItemText(enItemText);
    const zhItem = parseItemText(zhItemText);
    const zhTwItem = parseItemText(zhTwItemText);

    expect(enItem).not.toBeNull();
    expect(zhItem).not.toBeNull();
    expect(zhTwItem).not.toBeNull();
    expect(enItem!.slotType).toBe('Body Armour');
    expect(zhItem!.slotType).toBe('Body Armour');
    expect(zhTwItem!.slotType).toBe('Body Armour');
    expect(enItem!.armourStats?.energyShield).toBe(520);
    expect(zhItem!.armourStats?.energyShield).toBe(520);
    expect(zhTwItem!.armourStats?.energyShield).toBe(520);
    expect(zhItem!.explicits).toEqual(enItem!.explicits);
    expect(zhTwItem!.explicits).toEqual(enItem!.explicits);
  });

  it('resolves pobb.in and pastebin URLs to raw endpoints', () => {
    expect(resolveShareUrl('https://pobb.in/AbCd1234')).toBe('https://pobb.in/AbCd1234/raw');
    expect(resolveShareUrl('https://pastebin.com/XyZ987')).toBe('https://pastebin.com/raw/XyZ987');
  });

  it.each([
    ['https://poe.ninja/poe1/pob/9cee7', 'https://poe.ninja/poe1/pob/raw/9cee7'],
    ['https://poe.ninja/poe1/pob/raw/9cee7', 'https://poe.ninja/poe1/pob/raw/9cee7'],
    ['https://poe.ninja/pob/75b38', 'https://poe.ninja/pob/raw/75b38'],
    ['https://poe.ninja/pob/raw/75b38', 'https://poe.ninja/pob/raw/75b38'],
    ['https://poe.ninja/poe2/pob/29daf', 'https://poe.ninja/poe2/pob/raw/29daf'],
    ['https://poe.ninja/poe2/pob/raw/29daf', 'https://poe.ninja/poe2/pob/raw/29daf'],
    [' https://www.poe.ninja/poe1/pob/9cee7?foo=bar#section ', 'https://poe.ninja/poe1/pob/raw/9cee7'],
    ['https://POE.NINJA/POE1/pob/9cee7', 'https://poe.ninja/poe1/pob/raw/9cee7'],
  ])('resolves Ninja share URL %s to %s', (url, expected) => {
    expect(resolveShareUrl(url)).toBe(expected);
  });

  it.each([
    ['https://maxroll.gg/poe/pob/ab12cd34', 'https://maxroll.gg/poe/api/pob/ab12cd34'],
    ['https://maxroll.gg/poe/api/pob/ab12cd34', 'https://maxroll.gg/poe/api/pob/ab12cd34'],
    ['https://www.maxroll.gg/poe/pob/ab12cd34?tab=tree#top', 'https://maxroll.gg/poe/api/pob/ab12cd34'],
    ['https://maxroll.gg/poe2/pob/ef56gh78', 'https://maxroll.gg/poe2/api/pob/ef56gh78'],
    ['https://MAXROLL.GG/POE2/api/pob/ef56gh78', 'https://maxroll.gg/poe2/api/pob/ef56gh78'],
  ])('resolves Maxroll share URL %s to %s', (url, expected) => {
    expect(resolveShareUrl(url)).toBe(expected);
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

  it('round-trips multiple Skill Sets and enemyBlinded config through PoB XML', () => {
    const base = createSamplePoe1Build();
    const bossSkills = [
      {
        id: 'boss_sg_1',
        label: 'Boss Fireball',
        enabled: true,
        slot: 'Body Armour' as const,
        gems: [
          { instanceId: 'bg_1', gemId: 'poe1_fireball', level: 21, quality: 20, enabled: true },
        ],
      },
    ];
    const multiSkillBuild = {
      ...base,
      skills: bossSkills,
      mainSkillGroupId: 'boss_sg_1',
      skillSets: [
        { id: '1', title: 'Clear', skills: base.skills, mainSkillGroupId: base.mainSkillGroupId },
        { id: '2', title: 'Boss', skills: bossSkills, mainSkillGroupId: 'boss_sg_1' },
      ],
      activeSkillSetIndex: 1,
      config: { ...base.config, enemyBlinded: true },
    };

    const code = encodeBuildToPobCode(multiSkillBuild);
    const { build: decoded, xml } = importBuildFromCode(code);
    expect(xml).toContain('<Skills activeSkillSet="2"');
    expect(xml).toContain('name="conditionEnemyBlinded"');
    expect(decoded.skillSets?.length).toBe(2);
    expect(decoded.activeSkillSetIndex).toBe(1);
    expect(decoded.skills[0]!.gems[0]!.gemId).toBe('poe1_fireball');
    expect(decoded.config.enemyBlinded).toBe(true);
  });

  it('detects poe.ninja character URLs and rejects HTML / non-PoB XML instead of falling back to PoE 1', async () => {
    const info = parsePoeNinjaCharacterUrl(
      'https://poe.ninja/poe2/builds/forbiddenrites/character/brazwv-1435/ArkkFR',
    );
    expect(info).toEqual({
      game: 'poe2',
      league: 'forbiddenrites',
      account: 'brazwv-1435',
      character: 'ArkkFR',
    });

    const poe1Info = parsePoeNinjaCharacterUrl(
      'https://poe.ninja/poe1/builds/covens/character/sample-1234/HeroName',
    );
    expect(poe1Info?.game).toBe('poe1');

    await expect(
      fetchRemoteBuildCode('https://poe.ninja/poe2/builds/forbiddenrites/character/brazwv-1435/ArkkFR'),
    ).rejects.toThrow(/Copy PoB code/i);

    expect(() =>
      importBuildFromCode('<!doctype html><html><head><title>Just a moment...</title></head><body></body></html>'),
    ).toThrow(/HTML webpage/i);

    expect(() => importBuildFromCode('<NotPoB><Foo /></NotPoB>')).toThrow(/Invalid Path of Building XML/i);
  });

  it('parses real PoE 1/2 CN & TW Ctrl+C items with 物品种类, 护甲值, 符文结界, (rune), dual res/attr & local prefixes', () => {
    const cnPoe2Chest = `物品种类: 胸甲
稀有度: 稀有
苍穹 守护者
符文冠军胸甲
--------
品质: +20% (augmented)
护甲值: 850 (augmented)
能量护盾: 520 (augmented)
符文结界: 320 (augmented)
--------
需求:
等级: 78
力量: 112
智慧: 112
--------
+45 生命上限 (rune)
--------
+115 生命上限
火焰和闪电抗性 +38%
力量和智慧 +26
该装备的护甲提高 85%
法术伤害提高 48%
获得相当于伤害 15% 的额外闪电伤害`;

    const parsedCn = parseItemText(cnPoe2Chest, 'test_cn_chest', 'poe2');
    expect(parsedCn).not.toBeNull();
    expect(parsedCn!.slotType).toBe('Body Armour');
    expect(parsedCn!.armourStats?.armour).toBe(850);
    expect(parsedCn!.armourStats?.energyShield).toBe(520);
    expect(parsedCn!.armourStats?.ward).toBe(320);
    expect(parsedCn!.implicits).toContain('+45 to maximum Life');
    expect(parsedCn!.explicits).toContain('+115 to maximum Life');
    expect(parsedCn!.explicits).toContain('+38% to Fire and Lightning Resistances');
    expect(parsedCn!.explicits).toContain('+26 to Strength and Intelligence');
    expect(parsedCn!.explicits).toContain('85% increased Armour');
    expect(parsedCn!.explicits).toContain('48% increased Spell Damage');
    expect(parsedCn!.explicits).toContain('Gain 15% of Damage as Extra Lightning Damage');
    // Requirements sub-lines like "力量: 112" must never leak into implicits/explicits
    expect([...parsedCn!.implicits, ...parsedCn!.explicits].join('\n')).not.toContain('力量: 112');

    const twWeapon = `物品類型: 法杖
稀有度: 稀有
雷霆 魔杖
先知法杖
--------
物理傷害: 35-68 (augmented)
元素傷害: 20-45 (augmented), 15-85 (augmented)
攻擊暴擊率: 9.50%
每秒攻擊次數: 1.55
--------
增加 55% 法術傷害
+3 所有閃電法術技能的等級
+18% 火焰與冰冷抗性`;
    const parsedTw = parseItemText(twWeapon, 'test_tw_wand', 'poe2');
    expect(parsedTw).not.toBeNull();
    expect(parsedTw!.slotType).toBe('Weapon 1');
    expect(parsedTw!.weaponStats?.critChance).toBe(9.5);
    expect(parsedTw!.weaponStats?.elementalDamage?.Fire).toEqual([20, 45]);
    expect(parsedTw!.weaponStats?.elementalDamage?.Cold).toEqual([15, 85]);
    expect(parsedTw!.explicits).toContain('55% increased Spell Damage');
    expect(parsedTw!.explicits).toContain('+3 to Level of all Lightning Spell Skill Gems');
    expect(parsedTw!.explicits).toContain('+18% to Fire and Cold Resistances');
  });

  it('parses PoE 2 AttributeOverride, optional quest rewards, Corrupted/Twice Corrupted flags, and skips Rune/ModRange noise', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="100" className="Witch" ascendClassName="Blood Mage" mainSocketGroup="1" />
  <Tree activeSpec="1">
    <Spec treeVersion="0_5" nodes="1,2,3">
      <Overrides>
        <AttributeOverride strNodes="101,102" dexNodes="201" intNodes="301" />
      </Overrides>
    </Spec>
  </Tree>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: UNIQUE
Morior Invictus
Grand Regalia
Energy Shield: 286
Quality: 20
Sockets: S S S S S
Rune: Soul Core of Jiquani
Implicits: 1
+1% to all Maximum Elemental Resistances
+9% to all Elemental Resistances per Socket filled
Twice Corrupted
&lt;ModRange id="1" range="0.5"/&gt;
    </Item>
    <ItemSet id="1">
      <Slot name="Body Armour" itemId="1" />
    </ItemSet>
  </Items>
  <Config activeConfigSet="1">
    <ConfigSet id="1">
      <Input name="questAct2" string="+10% to Lightning Resistance" />
      <Input name="questInterlude" string="30% increased Global Armour, Evasion and Energy Shield" />
    </ConfigSet>
  </Config>
</PathOfBuilding2>`;

    const build = xmlToBuild(xml);
    expect(build.tree.attributeOverrides).toEqual({
      101: 'str',
      102: 'str',
      201: 'dex',
      301: 'int',
    });
    const chest = build.items['imp_item_1']!;
    expect(chest.corrupted).toBe(true);
    expect([...chest.implicits, ...chest.explicits].join('\n')).not.toContain('Rune:');
    expect([...chest.implicits, ...chest.explicits].join('\n')).not.toContain('Twice Corrupted');
    expect([...chest.implicits, ...chest.explicits].join('\n')).not.toContain('<ModRange');
    // Fixed campaign baseline (+10% Lightning Res) is excluded; optional quest reward is kept
    expect(build.config.customMods).toContain('30% increased Global Armour, Evasion and Energy Shield');
    expect(build.config.customMods).not.toContain('+10% to Lightning Resistance');

    // Round-trip preserves AttributeOverride
    const roundTripped = xmlToBuild(buildToPobXml(build));
    expect(roundTripped.tree.attributeOverrides).toEqual(build.tree.attributeOverrides);
  });
});
