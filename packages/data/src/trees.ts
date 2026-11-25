import type { GameId, PassiveNode, PassiveTreeData } from '@webpob/core';

interface NodeSeed {
  id: number;
  en: string;
  zh: string;
  kind: PassiveNode['kind'];
  angleDeg: number;
  radius: number;
  stats: string[];
  classStartId?: string;
  iconTag?: string;
}

function buildRadialTree(
  game: GameId,
  version: string,
  seeds: NodeSeed[],
  edges: Array<[number, number]>,
  classStartNodeIds: Record<string, number>,
): PassiveTreeData {
  const nodes: Record<number, PassiveNode> = {};

  for (const seed of seeds) {
    const rad = (seed.angleDeg * Math.PI) / 180;
    nodes[seed.id] = {
      id: seed.id,
      name: { en: seed.en, zh: seed.zh },
      kind: seed.kind,
      x: Math.round(Math.cos(rad) * seed.radius),
      y: Math.round(Math.sin(rad) * seed.radius),
      stats: seed.stats,
      adjacent: [],
      classStartId: seed.classStartId,
      iconTag: seed.iconTag,
    };
  }

  for (const [a, b] of edges) {
    const na = nodes[a];
    const nb = nodes[b];
    if (na && nb) {
      if (!na.adjacent.includes(b)) na.adjacent.push(b);
      if (!nb.adjacent.includes(a)) nb.adjacent.push(a);
    }
  }

  return { game, version, nodes, classStartNodeIds };
}

// =============================================================================
// Path of Exile 1 Passive Tree (Starter Radial Topology - Phase 1 MVP)
// Angles follow classic PoE wheel:
//   Witch (Top, -90°), Shadow (Top-Right, -30°), Ranger (Bottom-Right, 30°),
//   Duelist (Bottom, 90°), Marauder (Bottom-Left, 150°), Templar (Top-Left, 210°), Scion (Center, 0)
// =============================================================================
const POE1_SEEDS: NodeSeed[] = [
  // Center Scion hub
  { id: 1000, en: 'Scion', zh: '贵族起点', kind: 'start', angleDeg: 0, radius: 0, stats: [], classStartId: 'Scion' },
  { id: 1001, en: 'Path of the Savant', zh: '博学者之路', kind: 'small', angleDeg: -90, radius: 105, stats: ['+10 to Intelligence', '6% increased Spell Damage'] },
  { id: 1002, en: 'Path of the Hunter', zh: '猎手之路', kind: 'small', angleDeg: 30, radius: 105, stats: ['+10 to Dexterity', '5% increased Attack Speed'] },
  { id: 1003, en: 'Path of the Warrior', zh: '战士之路', kind: 'small', angleDeg: 150, radius: 105, stats: ['+10 to Strength', '+15 to maximum Life'] },
  { id: 1004, en: 'Constitution', zh: '体质', kind: 'notable', angleDeg: 90, radius: 120, stats: ['+25 to maximum Life', '14% increased maximum Life'], iconTag: 'life' },

  // 6 Class Start Nodes (Inner Ring r=250)
  { id: 1100, en: 'Witch', zh: '女巫起点', kind: 'start', angleDeg: -90, radius: 245, stats: [], classStartId: 'Witch' },
  { id: 1200, en: 'Shadow', zh: '暗影刺客起点', kind: 'start', angleDeg: -30, radius: 245, stats: [], classStartId: 'Shadow' },
  { id: 1300, en: 'Ranger', zh: '游侠起点', kind: 'start', angleDeg: 30, radius: 245, stats: [], classStartId: 'Ranger' },
  { id: 1400, en: 'Duelist', zh: '决斗者起点', kind: 'start', angleDeg: 90, radius: 245, stats: [], classStartId: 'Duelist' },
  { id: 1500, en: 'Marauder', zh: '野蛮人起点', kind: 'start', angleDeg: 150, radius: 245, stats: [], classStartId: 'Marauder' },
  { id: 1600, en: 'Templar', zh: '圣堂武僧起点', kind: 'start', angleDeg: 210, radius: 245, stats: [], classStartId: 'Templar' },

  // Inner Highway Ring (r=330) connecting sectors
  { id: 2001, en: 'Intelligence', zh: '智慧', kind: 'small', angleDeg: -108, radius: 330, stats: ['+10 to Intelligence'] },
  { id: 2002, en: 'Spell Damage', zh: '法术伤害', kind: 'small', angleDeg: -72, radius: 330, stats: ['12% increased Spell Damage'] },
  { id: 2003, en: 'Intelligence', zh: '智慧', kind: 'small', angleDeg: -48, radius: 330, stats: ['+10 to Intelligence'] },
  { id: 2004, en: 'Dexterity', zh: '敏捷', kind: 'small', angleDeg: -12, radius: 330, stats: ['+10 to Dexterity'] },
  { id: 2005, en: 'Evasion and Life', zh: '闪避与生命', kind: 'small', angleDeg: 12, radius: 330, stats: ['12% increased Evasion Rating', '5% increased maximum Life'] },
  { id: 2006, en: 'Dexterity', zh: '敏捷', kind: 'small', angleDeg: 48, radius: 330, stats: ['+10 to Dexterity'] },
  { id: 2007, en: 'Attack Speed', zh: '攻击速度', kind: 'small', angleDeg: 72, radius: 330, stats: ['5% increased Attack Speed'] },
  { id: 2008, en: 'Strength', zh: '力量', kind: 'small', angleDeg: 108, radius: 330, stats: ['+10 to Strength'] },
  { id: 2009, en: 'Armour and Life', zh: '护甲与生命', kind: 'small', angleDeg: 132, radius: 330, stats: ['12% increased Armour', '5% increased maximum Life'] },
  { id: 2010, en: 'Strength', zh: '力量', kind: 'small', angleDeg: 168, radius: 330, stats: ['+10 to Strength'] },
  { id: 2011, en: 'Elemental Resistances', zh: '元素抗性', kind: 'small', angleDeg: 192, radius: 330, stats: ['+8% to all Elemental Resistances'] },
  { id: 2012, en: 'Intelligence and Strength', zh: '智慧与力量', kind: 'small', angleDeg: 228, radius: 330, stats: ['+10 to Intelligence', '+10 to Strength'] },

  // Witch Sector (-90°): Spell / Lightning / Energy Shield / Crit
  { id: 3101, en: 'Arcanist Dominion', zh: '奥术支配', kind: 'notable', angleDeg: -90, radius: 395, stats: ['24% increased Spell Damage', '6% increased Cast Speed', '+20 to Intelligence'], iconTag: 'spell' },
  { id: 3102, en: 'Lightning Damage', zh: '闪电伤害', kind: 'small', angleDeg: -102, radius: 470, stats: ['14% increased Lightning Damage'] },
  { id: 3103, en: 'Storm Weaver', zh: '风暴编织', kind: 'notable', angleDeg: -96, radius: 555, stats: ['30% increased Lightning Damage', '8% increased Cast Speed', 'Damage Penetrates 6% Lightning Resistance'], iconTag: 'lightning' },
  { id: 3104, en: 'Energy Shield', zh: '能量护盾', kind: 'small', angleDeg: -78, radius: 470, stats: ['10% increased maximum Energy Shield'] },
  { id: 3105, en: 'Arcane Focus', zh: '秘术专注', kind: 'notable', angleDeg: -70, radius: 555, stats: ['25% increased maximum Energy Shield', '+20 to Intelligence'], iconTag: 'es' },
  { id: 3106, en: 'Cruel Preparation', zh: '残酷预备', kind: 'notable', angleDeg: -120, radius: 470, stats: ['10% increased maximum Life', '+8% to all Elemental Resistances'], iconTag: 'life' },
  { id: 3107, en: 'Heart of Flame', zh: '烈焰之心', kind: 'notable', angleDeg: -135, radius: 560, stats: ['32% increased Fire Damage', 'Damage Penetrates 8% Fire Resistance'], iconTag: 'fire' },
  { id: 3108, en: 'Chaos Inoculation', zh: '异灵之体 (CI)', kind: 'keystone', angleDeg: -60, radius: 660, stats: ['Maximum Life becomes 1, Immune to Chaos Damage', '15% more Energy Shield'], iconTag: 'keystone' },

  // Shadow Sector (-30°): Crit / Cold / Chaos / Trickster Defences
  { id: 3201, en: 'Assassination', zh: '暗杀', kind: 'notable', angleDeg: -30, radius: 410, stats: ['40% increased Critical Strike Chance', '+25% to Global Critical Strike Multiplier'], iconTag: 'crit' },
  { id: 3202, en: 'Spell Crit', zh: '法术暴击', kind: 'small', angleDeg: -42, radius: 495, stats: ['20% increased Critical Strike Chance for Spells'] },
  { id: 3203, en: 'Doom Cast', zh: '毁灭施法', kind: 'notable', angleDeg: -45, radius: 585, stats: ['60% increased Critical Strike Chance for Spells', '+20% to Global Critical Strike Multiplier'], iconTag: 'crit' },
  { id: 3204, en: 'Written in Blood', zh: '血书', kind: 'notable', angleDeg: -16, radius: 495, stats: ['10% increased maximum Life', '12% increased maximum Energy Shield', '+15 to Strength'], iconTag: 'life' },
  { id: 3205, en: 'Elemental Focus', zh: '元素专注', kind: 'notable', angleDeg: -26, radius: 590, stats: ['26% increased Elemental Damage', '10% increased Cast Speed'], iconTag: 'ele' },
  { id: 3206, en: 'Ghost Dance', zh: '幽灵舞步', kind: 'keystone', angleDeg: -8, radius: 650, stats: ['20% increased Evasion Rating', '15% increased maximum Energy Shield'], iconTag: 'keystone' },

  // Ranger Sector (30°): Bow / Projectile / Spell Suppression / Move Speed
  { id: 3301, en: 'Finesse', zh: '灵巧', kind: 'notable', angleDeg: 30, radius: 410, stats: ['8% increased Attack Speed', '+150 to Accuracy Rating', '+20 to Dexterity'], iconTag: 'attack' },
  { id: 3302, en: 'Projectile Damage', zh: '投射物伤害', kind: 'small', angleDeg: 18, radius: 495, stats: ['14% increased Projectile Damage'] },
  { id: 3303, en: 'Ballistics', zh: '弹道学', kind: 'notable', angleDeg: 14, radius: 585, stats: ['28% increased Projectile Damage', '+20 to Dexterity', '+120 to Accuracy Rating'], iconTag: 'proj' },
  { id: 3304, en: 'Inveterate', zh: '老练', kind: 'notable', angleDeg: 42, radius: 495, stats: ['+18% chance to Suppress Spell Damage', '15% increased Evasion Rating'], iconTag: 'suppress' },
  { id: 3305, en: 'Herbalism', zh: '草药学', kind: 'notable', angleDeg: 32, radius: 590, stats: ['10% increased maximum Life', '+20 to maximum Life', '8% increased Movement Speed'], iconTag: 'life' },
  { id: 3306, en: 'King of the Hill', zh: '山丘之王', kind: 'notable', angleDeg: 52, radius: 585, stats: ['45% increased Critical Strike Chance', '+25% to Global Critical Strike Multiplier', '20% increased Attack Damage'], iconTag: 'crit' },

  // Duelist Sector (90°): Melee / Attack / Block / Life
  { id: 3401, en: 'Art of the Gladiator', zh: '角斗士技艺', kind: 'notable', angleDeg: 90, radius: 410, stats: ['12% increased Attack Speed', '10% increased Movement Speed', '+20 to Dexterity'], iconTag: 'attack' },
  { id: 3402, en: 'Melee Physical', zh: '近战物理', kind: 'small', angleDeg: 78, radius: 495, stats: ['14% increased Melee Damage'] },
  { id: 3403, en: 'Master of the Arena', zh: '竞技场大师', kind: 'notable', angleDeg: 82, radius: 585, stats: ['24% increased Melee Damage', '+20 to Strength', 'Regenerate 1.5% of Life per second'], iconTag: 'melee' },
  { id: 3404, en: 'Golem\'s Blood', zh: '魔像之血', kind: 'notable', angleDeg: 104, radius: 495, stats: ['12% increased maximum Life', 'Regenerate 1.6% of Life per second'], iconTag: 'life' },
  { id: 3405, en: 'Testudo', zh: '龟甲阵', kind: 'notable', angleDeg: 108, radius: 585, stats: ['+12% Chance to Block Attack Damage', '25% increased Armour'], iconTag: 'block' },
  { id: 3406, en: 'Iron Reflexes', zh: '霸体', kind: 'keystone', angleDeg: 68, radius: 660, stats: ['30% increased Armour', '+300 to Armour'], iconTag: 'keystone' },

  // Marauder Sector (150°): Life / Armour / Fire / Resolute Technique
  { id: 3501, en: 'Born to Fight', zh: '生而好战', kind: 'notable', angleDeg: 150, radius: 410, stats: ['26% increased Physical Damage', '6% increased Attack Speed', '+20 to Strength'], iconTag: 'melee' },
  { id: 3502, en: 'Maximum Life', zh: '最大生命', kind: 'small', angleDeg: 138, radius: 495, stats: ['6% increased maximum Life'] },
  { id: 3503, en: 'Juggernaut', zh: '主宰', kind: 'notable', angleDeg: 136, radius: 585, stats: ['12% increased maximum Life', '36% increased Armour', '+25 to maximum Life'], iconTag: 'life' },
  { id: 3504, en: 'Diamond Skin', zh: '钻石皮肤', kind: 'notable', angleDeg: 164, radius: 495, stats: ['+15% to all Elemental Resistances', '+2% to maximum Fire Resistance'], iconTag: 'res' },
  { id: 3505, en: 'Resolute Technique', zh: '坚毅之心 (RT)', kind: 'keystone', angleDeg: 168, radius: 645, stats: ["Your Hits can't be Evaded", 'Never deal Critical Strikes'], iconTag: 'keystone' },

  // Templar Sector (210°): Elemental / Mana / Life / Mind over Matter
  { id: 3601, en: 'Discipline and Training', zh: '纪律与训练', kind: 'notable', angleDeg: 210, radius: 410, stats: ['10% increased maximum Life', '+30 to maximum Life'], iconTag: 'life' },
  { id: 3602, en: 'Elemental Damage', zh: '元素伤害', kind: 'small', angleDeg: 198, radius: 495, stats: ['14% increased Elemental Damage'] },
  { id: 3603, en: 'Divine Judgement', zh: '神圣审判', kind: 'notable', angleDeg: 195, radius: 585, stats: ['40% increased Elemental Damage', 'Damage Penetrates 5% Elemental Resistance'], iconTag: 'ele' },
  { id: 3604, en: 'Sanctity', zh: '圣洁', kind: 'notable', angleDeg: 224, radius: 495, stats: ['20% increased Armour', '15% increased maximum Energy Shield', 'Regenerate 1% of Life per second', '+15 to Strength'], iconTag: 'es' },
  { id: 3605, en: 'Mind Over Matter', zh: '心灵升华 (MoM)', kind: 'keystone', angleDeg: 228, radius: 645, stats: ['30% of Damage is taken from Mana before Life', '+60 to maximum Mana', '20% increased maximum Mana'], iconTag: 'keystone' },
  { id: 3606, en: 'Elemental Overload', zh: '元素超载 (EO)', kind: 'keystone', angleDeg: -145, radius: 660, stats: ['35% more Elemental Damage'], iconTag: 'keystone' },
];

const POE1_EDGES: Array<[number, number]> = [
  // Scion hub to inner class starts
  [1000, 1001], [1001, 1100],
  [1000, 1002], [1002, 1300],
  [1000, 1003], [1003, 1500],
  [1000, 1004], [1004, 1400],
  // Inner class starts to highway ring
  [1100, 2001], [1100, 2002],
  [1200, 2003], [1200, 2004],
  [1300, 2005], [1300, 2006],
  [1400, 2007], [1400, 2008],
  [1500, 2009], [1500, 2010],
  [1600, 2011], [1600, 2012],
  // Complete ring connectivity
  [2001, 2012], [2002, 2003], [2004, 2005], [2006, 2007], [2008, 2009], [2010, 2011],
  // Witch branches
  [2001, 3101], [2002, 3101],
  [3101, 3102], [3102, 3103],
  [3101, 3104], [3104, 3105], [3105, 3108],
  [2001, 3106], [3106, 3107], [3107, 3606],
  // Shadow branches
  [2003, 3201], [2004, 3201],
  [3201, 3202], [3202, 3203], [3203, 3105],
  [3201, 3204], [3204, 3205], [3204, 3206],
  // Ranger branches
  [2005, 3301], [2006, 3301],
  [3301, 3302], [3302, 3303], [3303, 3206],
  [3301, 3304], [3304, 3305], [3304, 3306],
  // Duelist branches
  [2007, 3401], [2008, 3401],
  [3401, 3402], [3402, 3403], [3402, 3406], [3306, 3406],
  [3401, 3404], [3404, 3405],
  // Marauder branches
  [2009, 3501], [2010, 3501],
  [3501, 3502], [3502, 3503], [3405, 3503],
  [3501, 3504], [3504, 3505],
  // Templar branches
  [2011, 3601], [2012, 3601],
  [3601, 3602], [3602, 3603], [3504, 3603],
  [3601, 3604], [3604, 3605], [3604, 3106],
];

export const POE1_TREE: PassiveTreeData = buildRadialTree(
  'poe1',
  '3_26',
  POE1_SEEDS,
  POE1_EDGES,
  {
    Witch: 1100,
    Shadow: 1200,
    Ranger: 1300,
    Duelist: 1400,
    Marauder: 1500,
    Templar: 1600,
    Scion: 1000,
  },
);

// =============================================================================
// Path of Exile 2 Passive Tree (Starter Radial Topology with Spirit & Weapon Sets)
// =============================================================================
const POE2_SEEDS: NodeSeed[] = [
  // Class starts arranged on inner ring (r=220)
  { id: 5100, en: 'Sorceress / Witch', zh: '魔巫 / 女巫起点', kind: 'start', angleDeg: -90, radius: 220, stats: [], classStartId: 'Sorceress' },
  { id: 5200, en: 'Monk', zh: '武僧起点', kind: 'start', angleDeg: -30, radius: 220, stats: [], classStartId: 'Monk' },
  { id: 5300, en: 'Ranger / Huntress', zh: '游侠 / 女猎手起点', kind: 'start', angleDeg: 30, radius: 220, stats: [], classStartId: 'Ranger' },
  { id: 5400, en: 'Mercenary', zh: '佣兵起点', kind: 'start', angleDeg: 90, radius: 220, stats: [], classStartId: 'Mercenary' },
  { id: 5500, en: 'Warrior', zh: '战士起点', kind: 'start', angleDeg: 150, radius: 220, stats: [], classStartId: 'Warrior' },
  { id: 5600, en: 'Druid / Templar', zh: '德鲁伊 / 圣堂起点', kind: 'start', angleDeg: 210, radius: 220, stats: [], classStartId: 'Witch' },

  // Attribute Highway Ring (r=320)
  { id: 6001, en: 'Intelligence', zh: '智慧', kind: 'small', angleDeg: -108, radius: 320, stats: ['+5 to Intelligence'] },
  { id: 6002, en: 'Spell Damage', zh: '法术伤害', kind: 'small', angleDeg: -72, radius: 320, stats: ['12% increased Spell Damage'] },
  { id: 6003, en: 'Intelligence', zh: '智慧', kind: 'small', angleDeg: -48, radius: 320, stats: ['+5 to Intelligence'] },
  { id: 6004, en: 'Dexterity', zh: '敏捷', kind: 'small', angleDeg: -12, radius: 320, stats: ['+5 to Dexterity'] },
  { id: 6005, en: 'Evasion Rating', zh: '闪避值', kind: 'small', angleDeg: 12, radius: 320, stats: ['14% increased Evasion Rating'] },
  { id: 6006, en: 'Dexterity', zh: '敏捷', kind: 'small', angleDeg: 48, radius: 320, stats: ['+5 to Dexterity'] },
  { id: 6007, en: 'Attack Damage', zh: '攻击伤害', kind: 'small', angleDeg: 72, radius: 320, stats: ['12% increased Attack Damage'] },
  { id: 6008, en: 'Strength', zh: '力量', kind: 'small', angleDeg: 108, radius: 320, stats: ['+5 to Strength'] },
  { id: 6009, en: 'Armour', zh: '护甲', kind: 'small', angleDeg: 132, radius: 320, stats: ['14% increased Armour'] },
  { id: 6010, en: 'Strength', zh: '力量', kind: 'small', angleDeg: 168, radius: 320, stats: ['+5 to Strength'] },
  { id: 6011, en: 'Elemental Resistances', zh: '元素抗性', kind: 'small', angleDeg: 192, radius: 320, stats: ['+8% to all Elemental Resistances'] },
  { id: 6012, en: 'Spirit Flow', zh: '精魂涌流', kind: 'small', angleDeg: 228, radius: 320, stats: ['+10 to Spirit', '+5 to Intelligence'] },

  // Sorceress / Witch Sector (-90°): Lightning / Cold / ES / Mana / Spirit
  { id: 7101, en: 'Raw Power', zh: '原始魔力', kind: 'notable', angleDeg: -90, radius: 405, stats: ['24% increased Spell Damage', '+15 to Intelligence'], iconTag: 'spell' },
  { id: 7102, en: 'Lightning Mastery', zh: '闪电专精', kind: 'small', angleDeg: -102, radius: 490, stats: ['15% increased Lightning Damage'] },
  { id: 7103, en: 'Lightning Rod', zh: '引雷针', kind: 'notable', angleDeg: -96, radius: 580, stats: ['35% increased Lightning Damage', 'Damage Penetrates 10% Lightning Resistance', '8% increased Cast Speed'], iconTag: 'lightning' },
  { id: 7104, en: 'Patient Barrier', zh: '坚韧屏障', kind: 'notable', angleDeg: -74, radius: 495, stats: ['40% increased maximum Energy Shield', '+30 to maximum Energy Shield'], iconTag: 'es' },
  { id: 7105, en: 'Pure Energy', zh: '纯粹能量', kind: 'notable', angleDeg: -66, radius: 590, stats: ['30% increased maximum Energy Shield', '+15 to Intelligence', '+15 to Spirit'], iconTag: 'es' },
  { id: 7106, en: 'Wildfire', zh: '野火蔓延', kind: 'notable', angleDeg: -118, radius: 510, stats: ['36% increased Fire Damage', '10% increased Area Damage'], iconTag: 'fire' },
  { id: 7107, en: 'Chaos Inoculation', zh: '异灵之体 (CI)', kind: 'keystone', angleDeg: -56, radius: 680, stats: ['Maximum Life becomes 1, Immune to Chaos Damage', '20% more Energy Shield'], iconTag: 'keystone' },
  { id: 7108, en: 'Eldritch Battery', zh: '异能魔力', kind: 'keystone', angleDeg: -115, radius: 660, stats: ['+180 to maximum Mana', '25% increased maximum Mana'], iconTag: 'keystone' },

  // Monk Sector (-30°): Quarterstaff / Crit / Cold / Lightning / Spirit
  { id: 7201, en: 'Flow Like Water', zh: '行云流水', kind: 'notable', angleDeg: -30, radius: 405, stats: ['10% increased Attack and Cast Speed', '18% increased Elemental Damage'], iconTag: 'attack' },
  { id: 7202, en: 'Crit Chance', zh: '暴击几率', kind: 'small', angleDeg: -40, radius: 495, stats: ['22% increased Critical Strike Chance'] },
  { id: 7203, en: 'Deadly Force', zh: '致命打击', kind: 'notable', angleDeg: -42, radius: 585, stats: ['45% increased Critical Strike Chance', '+30% to Global Critical Strike Multiplier'], iconTag: 'crit' },
  { id: 7204, en: 'Spectral Ward', zh: '灵能守护', kind: 'notable', angleDeg: -18, radius: 495, stats: ['25% increased Evasion Rating', '25% increased maximum Energy Shield', '+20 to Spirit'], iconTag: 'es' },
  { id: 7205, en: 'Essence of the Mountain', zh: '山岳精华', kind: 'notable', angleDeg: -22, radius: 590, stats: ['Gain 15% of Physical Damage as Extra Cold Damage', '24% increased Cold Damage'], iconTag: 'cold' },

  // Ranger / Huntress Sector (30°): Bow / Projectile / Movement Speed / Evasion
  { id: 7301, en: 'Honed Instincts', zh: '敏锐直觉', kind: 'notable', angleDeg: 30, radius: 405, stats: ['10% increased Attack Speed', '8% increased Movement Speed', '+15 to Dexterity'], iconTag: 'attack' },
  { id: 7302, en: 'Projectile Damage', zh: '投射物伤害', kind: 'small', angleDeg: 18, radius: 495, stats: ['15% increased Projectile Damage'] },
  { id: 7303, en: 'Master Fletching', zh: '制箭大师', kind: 'notable', angleDeg: 14, radius: 585, stats: ['32% increased Projectile Damage', '+180 to Accuracy Rating'], iconTag: 'proj' },
  { id: 7304, en: 'Enhanced Reflexes', zh: '强化反射', kind: 'notable', angleDeg: 44, radius: 495, stats: ['35% increased Evasion Rating', '+12% to all Elemental Resistances'], iconTag: 'evasion' },
  { id: 7305, en: 'Acrobatics', zh: '移形换影', kind: 'keystone', angleDeg: 32, radius: 645, stats: ['25% increased Evasion Rating', '10% increased Movement Speed'], iconTag: 'keystone' },

  // Mercenary Sector (90°): Crossbow / Weapon Set / Reload / Two-Handed
  { id: 7401, en: 'Merciless Munitions', zh: '无情弹药', kind: 'notable', angleDeg: 90, radius: 405, stats: ['28% increased Attack Damage', '8% increased Attack Speed'], iconTag: 'attack' },
  { id: 7402, en: 'Weapon Mastery', zh: '武器专精', kind: 'small', angleDeg: 78, radius: 495, stats: ['14% increased Physical Damage'] },
  { id: 7403, en: 'Full Salvo', zh: '全力齐射', kind: 'notable', angleDeg: 80, radius: 585, stats: ['30% increased Projectile Damage', '20% increased Elemental Damage'], iconTag: 'proj' },
  { id: 7404, en: 'Adrenaline Rush', zh: '肾上腺素', kind: 'notable', angleDeg: 104, radius: 495, stats: ['+40 to maximum Life', '20% increased Armour', '20% increased Evasion Rating'], iconTag: 'life' },

  // Warrior Sector (150°): Slam / Armour / Block / Life / Giant's Blood
  { id: 7501, en: 'Brutal', zh: '残暴之力', kind: 'notable', angleDeg: 150, radius: 405, stats: ['30% increased Physical Damage', '+20 to Strength'], iconTag: 'melee' },
  { id: 7502, en: 'Heavy Armour', zh: '重型护甲', kind: 'small', angleDeg: 138, radius: 495, stats: ['18% increased Armour'] },
  { id: 7503, en: 'Titanic Might', zh: '泰坦神力', kind: 'notable', angleDeg: 136, radius: 585, stats: ['35% increased Melee Damage', '+45 to maximum Life', '30% increased Armour'], iconTag: 'melee' },
  { id: 7504, en: 'Prism Guard', zh: '棱镜守卫', kind: 'notable', angleDeg: 164, radius: 495, stats: ['+14% to all Elemental Resistances', '+2% to maximum Fire Resistance', '+10% Chance to Block Attack Damage'], iconTag: 'res' },
  { id: 7505, en: 'Resolute Technique', zh: '坚毅之心 (RT)', kind: 'keystone', angleDeg: 168, radius: 645, stats: ["Your Hits can't be Evaded", 'Never deal Critical Strikes'], iconTag: 'keystone' },

  // Druid / Spirit Sector (210°): Spirit / Elemental / Mind over Matter
  { id: 7601, en: 'Harmonious Spirit', zh: '和谐精魂', kind: 'notable', angleDeg: 210, radius: 405, stats: ['+30 to Spirit', '20% increased Elemental Damage', '+10% to all Elemental Resistances'], iconTag: 'spirit' },
  { id: 7602, en: 'Mind Over Matter', zh: '心灵升华 (MoM)', kind: 'keystone', angleDeg: 222, radius: 575, stats: ['30% of Damage is taken from Mana before Life', '+100 to maximum Mana', '25% increased maximum Mana'], iconTag: 'keystone' },
];

const POE2_EDGES: Array<[number, number]> = [
  // Class starts to ring
  [5100, 6001], [5100, 6002],
  [5200, 6003], [5200, 6004],
  [5300, 6005], [5300, 6006],
  [5400, 6007], [5400, 6008],
  [5500, 6009], [5500, 6010],
  [5600, 6011], [5600, 6012],
  // Ring connections
  [6001, 6012], [6002, 6003], [6004, 6005], [6006, 6007], [6008, 6009], [6010, 6011],
  // Sorceress branches
  [6001, 7101], [6002, 7101],
  [7101, 7102], [7102, 7103],
  [7101, 7104], [7104, 7105], [7105, 7107],
  [6001, 7106], [7106, 7108],
  // Monk branches
  [6003, 7201], [6004, 7201],
  [7201, 7202], [7202, 7203], [7203, 7105],
  [7201, 7204], [7204, 7205],
  // Ranger branches
  [6005, 7301], [6006, 7301],
  [7301, 7302], [7302, 7303], [7303, 7204],
  [7301, 7304], [7304, 7305],
  // Mercenary branches
  [6007, 7401], [6008, 7401],
  [7401, 7402], [7402, 7403], [7403, 7304],
  [7401, 7404],
  // Warrior branches
  [6009, 7501], [6010, 7501],
  [7501, 7502], [7502, 7503], [7404, 7503],
  [7501, 7504], [7504, 7505],
  // Spirit / Druid branches
  [6011, 7601], [6012, 7601],
  [7601, 7602], [7601, 7106], [7504, 7601],
];

export const POE2_TREE: PassiveTreeData = buildRadialTree(
  'poe2',
  '0_2',
  POE2_SEEDS,
  POE2_EDGES,
  {
    Sorceress: 5100,
    Witch: 5100,
    Monk: 5200,
    Ranger: 5300,
    Huntress: 5300,
    Mercenary: 5400,
    Warrior: 5500,
  },
);

const registeredOfficialTrees: Partial<Record<GameId, PassiveTreeData>> = {};

export function registerTreeData(tree: PassiveTreeData): void {
  registeredOfficialTrees[tree.game] = tree;
}

export function hasOfficialTreeLoaded(game: GameId): boolean {
  return Boolean(registeredOfficialTrees[game]?.isOfficialFull);
}

export function getTreeForGame(game: GameId): PassiveTreeData {
  return registeredOfficialTrees[game] ?? (game === 'poe2' ? POE2_TREE : POE1_TREE);
}

/**
 * Finds the shortest path from any currently allocated node to `targetNodeId` using BFS.
 * Returns the ordered array of newly-allocated node IDs (excluding already-allocated start).
 */
export function findShortestPathToNode(
  tree: PassiveTreeData,
  allocatedSet: Set<number>,
  targetNodeId: number,
): number[] {
  if (allocatedSet.has(targetNodeId) || !tree.nodes[targetNodeId]) {
    return [];
  }

  const queue: number[] = [];
  const parent = new Map<number, number | null>();

  for (const id of allocatedSet) {
    if (tree.nodes[id]) {
      queue.push(id);
      parent.set(id, null);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = tree.nodes[current];
    if (!node) continue;

    for (const neighbor of node.adjacent) {
      if (parent.has(neighbor)) continue;
      parent.set(neighbor, current);
      if (neighbor === targetNodeId) {
        const path: number[] = [];
        let cursor: number | null = neighbor;
        while (cursor !== null && !allocatedSet.has(cursor)) {
          path.push(cursor);
          cursor = parent.get(cursor) ?? null;
        }
        return path.reverse();
      }
      queue.push(neighbor);
    }
  }

  return [];
}

/**
 * Maps display ascendancy names to the canonical internal `ascendancyId` key used in GGG's
 * official tree JSON (e.g. PoE 1 3.30 Ranger's "Warden" still uses internal key "Raider",
 * and PoE 2 0.5 Witch's "Abyssal Lich" shares "Lich" passive nodes).
 */
export function normalizeAscendancyTreeKey(ascendancyId?: string): string {
  const target = ascendancyId?.toLowerCase().trim() ?? '';
  if (!target || target === 'none') return '';
  if (target === 'warden') return 'raider';
  if (target === 'abyssal lich') return 'lich';
  return target;
}

/**
 * Finds the start node ID of an Ascendancy sub-tree (e.g. 'Elementalist', 'Warden', 'Stormweaver').
 */
export function getAscendancyStartNodeId(
  tree: PassiveTreeData,
  ascendancyId?: string,
): number | undefined {
  if (!ascendancyId) return undefined;
  const rawTarget = ascendancyId.toLowerCase().trim();
  const treeKey = normalizeAscendancyTreeKey(ascendancyId);
  if (!treeKey) return undefined;

  let fallbackCandidate: number | undefined;
  for (const node of Object.values(tree.nodes)) {
    if (!node.ascendancyId || node.ascendancyId.toLowerCase() !== treeKey) continue;
    const enLower = node.name.en.toLowerCase();
    if (enLower === rawTarget || enLower === treeKey) {
      return node.id;
    }
    if (fallbackCandidate === undefined && node.stats.length === 0 && node.adjacent.length >= 2) {
      fallbackCandidate = node.id;
    }
  }
  return fallbackCandidate;
}

/**
 * Given a set of allocated nodes and one or more root start nodes (e.g. [classStart, ascStart]),
 * removes `targetNodeId` and prunes any nodes that become disconnected from all roots.
 */
export function removeNodeAndPruneDisconnected(
  tree: PassiveTreeData,
  allocatedIds: number[],
  rootNodeIds: number | number[],
  targetNodeId: number,
): number[] {
  const roots = (Array.isArray(rootNodeIds) ? rootNodeIds : [rootNodeIds]).filter(
    (id) => Boolean(tree.nodes[id]),
  );
  if (roots.includes(targetNodeId)) {
    return allocatedIds;
  }

  const remaining = new Set(allocatedIds);
  remaining.delete(targetNodeId);

  const reachable = new Set<number>();
  const queue: number[] = [];
  for (const r of roots) {
    if (remaining.has(r) || r === roots[0]) {
      remaining.add(r);
      reachable.add(r);
      queue.push(r);
    }
  }

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const node = tree.nodes[cur];
    if (!node) continue;
    for (const next of node.adjacent) {
      if (remaining.has(next) && !reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }

  return allocatedIds.filter((id) => reachable.has(id));
}
