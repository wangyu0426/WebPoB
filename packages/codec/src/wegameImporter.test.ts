import { describe, expect, it } from 'vitest';
import { normalizeStatLineToEn } from '@webpob/i18n';
import {
  cleanWeGameMarkup,
  extractWeGamePoe2ShareCode,
  isWeGamePoe2ShareUrl,
  parseWeGamePoe2Build,
  type WeGamePoe2Bundle,
} from './wegameImporter.js';

describe('wegameImporter URL & markup helpers', () => {
  it('extracts share hashes from WeGame PoE 2 helper URLs', () => {
    const code = 'ExampleShareCode1234567890_ABCDEF-xyz';
    expect(extractWeGamePoe2ShareCode(`https://www.wegame.com.cn/helper/poe2/#/share/${code}`)).toBe(code);
    expect(extractWeGamePoe2ShareCode(`https://wegame.com.cn/helper/poe2/#/share/${code}?from=test`)).toBe(code);
    expect(isWeGamePoe2ShareUrl(`https://www.wegame.com.cn/helper/poe2/#/share/${code}`)).toBe(true);
    expect(isWeGamePoe2ShareUrl('https://pobb.in/abc12345')).toBe(false);
    expect(extractWeGamePoe2ShareCode('https://example.test/share/short')).toBeNull();
  });

  it('strips PoE 2 inline keyword markup cleanly', () => {
    expect(cleanWeGameMarkup('[Resistances|闪电抗性] +37%')).toBe('闪电抗性 +37%');
    expect(cleanWeGameMarkup('[ShamanOnlyMods|羁绊]： +40 生命上限')).toBe('羁绊： +40 生命上限');
  });

  it('normalizes PoE 2 WeGame Chinese stat lines into canonical English mods', () => {
    expect(normalizeStatLineToEn('+45 生命上限')).toBe('+45 to maximum Life');
    expect(normalizeStatLineToEn('[ShamanOnlyMods|羁绊]： +40 生命上限')).toBe('Bonded: +40 to maximum Life');
    expect(normalizeStatLineToEn('[ShamanOnlyMods|羁绊]： +40 魔力上限')).toBe('Bonded: +40 to maximum Mana');
    expect(normalizeStatLineToEn('+297 点[Evasion|闪避]值')).toBe('+297 to Evasion Rating');
    expect(normalizeStatLineToEn('[Evasion|闪避]值提高 109%')).toBe('109% increased Evasion Rating');
    expect(normalizeStatLineToEn('[Resistances|闪电抗性] +37%')).toBe('+37% to Lightning Resistance');
    expect(normalizeStatLineToEn('所有[ElementalDamage|元素][Resistances|抗性] +16%')).toBe(
      '+16% to all Elemental Resistances',
    );
    expect(normalizeStatLineToEn('[CriticalDamageBonus|暴击伤害加成]提高 26%')).toBe(
      '+26% to Global Critical Strike Multiplier',
    );
    expect(normalizeStatLineToEn('该武器的[Attack|攻击]穿透 18% 的火焰抗性')).toBe(
      'Damage Penetrates 18% Fire Resistance',
    );
  });
});

describe('parseWeGamePoe2Build', () => {
  it('converts a synthetic WeGame PoE 2 bundle into a complete WebPoB Build', () => {
    const bundle: WeGamePoe2Bundle = {
      shareCode: 'SyntheticShareCode0000000001',
      roleInfo: {
        role: {
          role_id: '100001',
          name: 'TestExile',
          level: 95,
          class_name: 'Stormweaver',
        },
      },
      roleProfile: {
        skills: [{ name: 'spark', total_dps: '123456' }],
      },
      talentTree: {
        talent_tree: {
          hashes: [1001, 1002, 1003],
          specialisations: {
            set1: [2001, 2002],
            set2: [3001, 3002],
          },
          quest_stats: ['+20 生命上限', '[Resistances|火焰抗性] +10%'],
        },
      },
      equipments: {
        equipments: [
          {
            id: 'aaaa111122223333',
            inventoryId: 'BodyArmour',
            frameType: 2,
            rarity: 'Rare',
            name: '测试护甲',
            baseType: '滑击背心',
            properties: [
              { name: '[Quality|品质]', values: [['+20%', 1]] },
              { name: '[Evasion|闪避值]', values: [['2400', 1]] },
            ],
            explicitMods: [
              { description: '+85 生命上限' },
              { description: '[Resistances|闪电抗性] +37%' },
            ],
            runeMods: ['[ShamanOnlyMods|羁绊]： +40 生命上限'],
          },
          {
            id: 'bbbb111122223333',
            inventoryId: 'Weapon',
            frameType: 2,
            rarity: 'Rare',
            name: '测试武器',
            baseType: '翱翔战矛',
            properties: [
              { name: '[Physical|物理]伤害', values: [['40-80', 1]] },
              { name: '[Critical|暴击]率', values: [['6.50%', 0]] },
              { name: '每秒攻击次数', values: [['2.10', 1]] },
            ],
            explicitMods: [{ description: '[Attack|攻击]速度提高 20%' }],
          },
          {
            id: 'cccc111122223333',
            inventoryId: 'Flask',
            frameType: 1,
            rarity: 'Magic',
            baseType: '融冰咒符',
            properties: [{ name: '咒符', values: [] }],
            implicitMods: [{ description: '陷入[Frozen|冻结]时自动使用' }],
          },
          {
            id: 'dddd111122223333',
            inventoryId: 'Flask',
            frameType: 3,
            rarity: 'Unique',
            baseType: '终极生命药剂',
            properties: [],
          },
        ],
      },
      skills: {
        skills: [
          {
            inventoryId: 'SkillSlots',
            baseType: 'Spark',
            properties: [
              { name: '等级', values: [['21', 1]] },
              { name: '品质', values: [['+20%', 1]] },
            ],
            socketedItems: [
              {
                baseType: 'Controlled Destruction II',
                properties: [{ name: '等级', values: [['20(最高等级)', 0]] }],
              },
            ],
          },
        ],
      },
      jewels: {
        jewel_data: JSON.stringify([
          {
            socket_id: 'PassiveJewel_4',
            socket_name: '珠宝插槽4',
            jewel: {
              id: 'eeee111122223333',
              display_name: '测试珠宝',
              name: '宝钻',
              rarity: 3,
              mod_descriptions: [{ type: 0, values: ['[Gain|获得]相当于伤害 10% 的额外[Cold|冰霜]伤害'] }],
            },
          },
        ]),
      },
    };

    const build = parseWeGamePoe2Build(bundle);
    expect(build.game).toBe('poe2');
    expect(build.level).toBe(95);
    expect(build.ascendancyId).toBe('Stormweaver');
    expect(build.tree.allocatedNodeIds).toEqual(expect.arrayContaining([1001, 1002, 1003]));
    expect(build.tree.weaponSet1NodeIds).toEqual([2001, 2002]);
    expect(build.tree.weaponSet2NodeIds).toEqual([3001, 3002]);

    const bodyId = build.equipped['Body Armour'];
    expect(bodyId).toBeDefined();
    expect(build.items[bodyId!]!.armourStats?.evasion).toBe(2400);
    expect(build.items[bodyId!]!.localStatsPrecomputed).toBe(true);
    expect(build.items[bodyId!]!.explicits).toContain('+85 生命上限');
    expect(build.items[bodyId!]!.implicits).toContain('羁绊： +40 生命上限');

    const wepId = build.equipped['Weapon 1'];
    expect(wepId).toBeDefined();
    expect(build.items[wepId!]!.weaponStats?.physicalMax).toBe(80);
    expect(build.items[wepId!]!.weaponStats?.attacksPerSecond).toBe(2.1);

    expect(build.equipped['Charm 1']).toBeDefined();
    expect(build.equipped['Flask 1']).toBeDefined();
    expect(build.skills.length).toBeGreaterThanOrEqual(1);
    expect(build.skills[0]!.gems[0]!.level).toBe(21);
    expect(build.skills[0]!.gems[0]!.quality).toBe(20);
    expect(build.notes).toContain('123,456');
    expect(build.notes).toContain('测试珠宝');
  });

  it('parses Sceptre native Spirit property, selects Weapon Set 2 when needed, and respects item-granted 0-Spirit auras', () => {
    const bundle: WeGamePoe2Bundle = {
      roleInfo: {
        role: { role_id: '20001', name: 'SpiritTester', level: 96, class_name: 'Spirit Walker' },
      },
      talentTree: {
        talent_tree: {
          hashes: [4367, 26294],
          quest_stats: [
            '+100 [Spirit|精魂]',
            '+20 生命上限',
            '生命上限提高 5%',
            '[Resistances|闪电抗性] +10%',
            '+5 [Strength|力量]',
            '魔力再生率提高 25%',
            '59 个[BrokenFace|毁面首领]',
          ],
        },
      },
      equipments: {
        equipments: [
          {
            id: 'amulet1',
            inventoryId: 'Amulet',
            frameType: 2,
            baseType: '翠玉项链',
            explicitMods: [{ description: '+33 [Spirit|精魂]' }],
          },
          {
            id: 'sceptre1',
            inventoryId: 'Offhand2',
            frameType: 3,
            name: '神圣之火',
            baseType: '圣地权杖',
            properties: [{ name: '[Spirit|精魂]', type: 25, values: [['115', 1]] }],
            runeMods: ['该装备[Spirit|精魂]提高 15%'],
          },
        ],
      },
      skills: {
        skills: [
          {
            inventoryId: null,
            baseType: 'Herald of Ice',
            properties: [{ name: '等级', values: [['19', 0]] }],
          },
          {
            inventoryId: 'SkillSlots',
            baseType: 'Archmage',
            properties: [
              { name: '等级', values: [['20', 0]] },
              { name: '保留', values: [['150 [Spirit|精魂]', 0]] },
            ],
          },
        ],
      },
    };

    const build = parseWeGamePoe2Build(bundle);
    const sceptreId = build.equipped['Weapon 2 Swap'];
    expect(sceptreId).toBeDefined();
    expect(build.items[sceptreId!]!.implicits).toContain('+115 to Spirit');
    expect(build.items[sceptreId!]!.implicits.some((l) => l.includes('提高 15%'))).toBe(false);
    expect(build.activeWeaponSet).toBe(2);
    expect(build.skills[0]!.gems[0]!.spiritReservationOverride).toBe(0);
    expect(build.skills[1]!.gems[0]!.spiritReservationOverride).toBe(150);
    expect(build.config.customMods).toContain('+5 力量');
    expect(build.config.customMods).toContain('魔力再生率提高 25%');
    // Fixed campaign baselines already in POE2_RULESET must NOT be double-counted in customMods
    expect(build.config.customMods).not.toContain('+20 生命上限');
    expect(build.config.customMods).not.toContain('生命上限提高 5%');
    expect(build.config.customMods).not.toContain('闪电抗性 +10%');
    expect(build.config.customMods).not.toContain('+100 精魂');
    expect(build.config.customMods).not.toContain('毁面首领');
  });
});
