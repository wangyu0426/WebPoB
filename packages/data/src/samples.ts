import type { Build, BuildConfig, GameId, Item } from '@webpob/core';
import { POE1_PRESET_ITEMS, POE2_PRESET_ITEMS } from './items.js';
import { POE1_TREE, POE2_TREE } from './trees.js';

export function createDefaultConfig(): BuildConfig {
  return {
    enemyLevel: 84,
    enemyIsBoss: 'Guardian',
    enemyFireResist: 30,
    enemyColdResist: 30,
    enemyLightningResist: 30,
    enemyChaosResist: 15,
    enemyArmour: 15000,
    enemyEvasion: 1800,
    usePowerCharges: true,
    powerCharges: 3,
    useFrenzyCharges: false,
    frenzyCharges: 3,
    useEnduranceCharges: false,
    enduranceCharges: 3,
    onslaught: false,
    enemyShocked: true,
    shockValue: 20,
    enemyChilled: false,
    customMods: '',
  };
}

function indexItems(items: Item[]): Record<string, Item> {
  const map: Record<string, Item> = {};
  for (const item of items) {
    map[item.id] = item;
  }
  return map;
}

export function createSamplePoe1Build(): Build {
  const items = indexItems(POE1_PRESET_ITEMS);
  return {
    id: 'sample-poe1-arc',
    name: 'Elementalist Arc (PoE 1 Sample)',
    game: 'poe1',
    level: 92,
    classId: 'Witch',
    ascendancyId: 'Elementalist',
    activeWeaponSet: 1,
    bandit: 'Alira',
    tree: {
      title: 'Endgame Crit Arc',
      treeVersion: POE1_TREE.version,
      allocatedNodeIds: [
        1100, 2001, 2002, 2003,
        3101, 3102, 3103, 3104, 3105, 3106,
        3201, 3202, 3203, 3204,
      ],
      weaponSet1NodeIds: [],
      weaponSet2NodeIds: [],
      masteryEffects: {},
    },
    skills: [
      {
        id: 'sg_main_arc',
        label: 'Main 6L Arc',
        enabled: true,
        slot: 'Body Armour',
        gems: [
          { instanceId: 'g1', gemId: 'poe1_arc', level: 20, quality: 20, enabled: true },
          { instanceId: 'g2', gemId: 'poe1_sup_spell_echo', level: 20, quality: 20, enabled: true },
          { instanceId: 'g3', gemId: 'poe1_sup_lightning_pen', level: 20, quality: 20, enabled: true },
          { instanceId: 'g4', gemId: 'poe1_sup_inspiration', level: 20, quality: 20, enabled: true },
          { instanceId: 'g5', gemId: 'poe1_sup_increased_crit_damage', level: 20, quality: 20, enabled: true },
        ],
      },
      {
        id: 'sg_auras',
        label: 'Auras',
        enabled: true,
        slot: 'Helmet',
        gems: [
          { instanceId: 'g6', gemId: 'poe1_wrath', level: 20, quality: 0, enabled: true },
          { instanceId: 'g7', gemId: 'poe1_discipline', level: 20, quality: 0, enabled: true },
        ],
      },
    ],
    mainSkillGroupId: 'sg_main_arc',
    items,
    equipped: {
      'Weapon 1': 'preset_poe1_wand_void',
      'Weapon 2': 'preset_poe1_shield_prism',
      Helmet: 'preset_poe1_helm_rare',
      'Body Armour': 'preset_poe1_body_inpulsa',
      Gloves: 'preset_poe1_gloves_rare',
      Boots: 'preset_poe1_boots_rare',
      Amulet: 'preset_poe1_amulet_rare',
      'Ring 1': 'preset_poe1_ring_1',
      'Ring 2': 'preset_poe1_ring_2',
      Belt: 'preset_poe1_belt_stygian',
    },
    config: createDefaultConfig(),
    notes:
      'PoE 1 Elementalist Arc sample build.\n\n- Switch language (中文 / EN) at the top-right to inspect bilingual passives, gems & items.\n- Hover passive nodes on the Tree tab to preview live DPS & Life/ES delta.\n- Try pasting Chinese or English Ctrl+C gear in the Items tab!',
  };
}

export function createSamplePoe2Build(): Build {
  const items = indexItems(POE2_PRESET_ITEMS);
  return {
    id: 'sample-poe2-spark',
    name: 'Stormweaver Archmage Spark (PoE 2 Sample)',
    game: 'poe2',
    level: 90,
    classId: 'Sorceress',
    ascendancyId: 'Stormweaver',
    activeWeaponSet: 1,
    tree: {
      title: 'Archmage ES / Mana',
      treeVersion: POE2_TREE.version,
      allocatedNodeIds: [
        5100, 6001, 6002, 6003, 6012,
        7101, 7104, 7105, 7601,
      ],
      // Demonstrate PoE 2 Weapon Set 1 (Lightning) vs Weapon Set 2 (Crit/Cold Swap) passives!
      weaponSet1NodeIds: [7102, 7103],
      weaponSet2NodeIds: [7201, 7202, 7203],
      masteryEffects: {},
    },
    skills: [
      {
        id: 'sg_poe2_spark',
        label: 'Spark (Weapon Set 1)',
        enabled: true,
        weaponSets: [1, 2],
        gems: [
          { instanceId: 'p2_g1', gemId: 'poe2_spark', level: 20, quality: 20, enabled: true },
          { instanceId: 'p2_g2', gemId: 'poe2_sup_arcane_tempo', level: 20, quality: 0, enabled: true },
          { instanceId: 'p2_g3', gemId: 'poe2_sup_considered_casting', level: 20, quality: 0, enabled: true },
          { instanceId: 'p2_g4', gemId: 'poe2_sup_lightning_infusion', level: 20, quality: 0, enabled: true },
          { instanceId: 'p2_g5', gemId: 'poe2_sup_supercritical', level: 20, quality: 0, enabled: true },
        ],
      },
      {
        id: 'sg_poe2_spirit',
        label: 'Spirit Buffs',
        enabled: true,
        weaponSets: [1, 2],
        gems: [
          { instanceId: 'p2_g6', gemId: 'poe2_archmage', level: 20, quality: 20, enabled: true },
          { instanceId: 'p2_g7', gemId: 'poe2_grim_feast', level: 20, quality: 0, enabled: true },
        ],
      },
    ],
    mainSkillGroupId: 'sg_poe2_spark',
    items,
    equipped: {
      'Weapon 1': 'preset_poe2_wand_siphoning',
      'Weapon 2': 'preset_poe2_focus_es',
      'Weapon 1 Swap': 'preset_poe2_staff_swap',
      Helmet: 'preset_poe2_helm_es',
      'Body Armour': 'preset_poe2_body_spirit',
      Boots: 'preset_poe2_boots_ms',
      Amulet: 'preset_poe2_amulet_spirit',
      'Ring 1': 'preset_poe2_ring_mana',
      Belt: 'preset_poe2_belt_ingenuity',
    },
    config: {
      ...createDefaultConfig(),
      enemyShocked: true,
      shockValue: 35,
    },
    notes:
      'PoE 2 Stormweaver Archmage Spark sample build.\n\n- Features PoE 2 Spirit pool (Base 100 + Body Armour + Amulet + Tree) reserving Archmage (100) + Grim Feast (30).\n- Try switching between Weapon Set 1 and Weapon Set 2 in the top bar or painting Set 1 / Set 2 passives on the Tree!',
  };
}

export function createEmptyBuild(game: GameId): Build {
  if (game === 'poe2') {
    return {
      id: `build-poe2-${Date.now()}`,
      name: 'New PoE 2 Build',
      game: 'poe2',
      level: 1,
      classId: 'Sorceress',
      ascendancyId: '',
      activeWeaponSet: 1,
      tree: {
        title: 'Default',
        treeVersion: POE2_TREE.version,
        allocatedNodeIds: [POE2_TREE.classStartNodeIds.Sorceress!],
        weaponSet1NodeIds: [],
        weaponSet2NodeIds: [],
        masteryEffects: {},
      },
      skills: [
        {
          id: 'sg_1',
          label: 'Main Skill',
          enabled: true,
          weaponSets: [1, 2],
          gems: [{ instanceId: 'g1', gemId: 'poe2_spark', level: 1, quality: 0, enabled: true }],
        },
      ],
      mainSkillGroupId: 'sg_1',
      items: {},
      equipped: {},
      config: createDefaultConfig(),
      notes: '',
    };
  }

  return {
    id: `build-poe1-${Date.now()}`,
    name: 'New PoE 1 Build',
    game: 'poe1',
    level: 1,
    classId: 'Witch',
    ascendancyId: '',
    activeWeaponSet: 1,
    bandit: 'None',
    tree: {
      title: 'Default',
      treeVersion: POE1_TREE.version,
      allocatedNodeIds: [POE1_TREE.classStartNodeIds.Witch!],
      weaponSet1NodeIds: [],
      weaponSet2NodeIds: [],
      masteryEffects: {},
    },
    skills: [
      {
        id: 'sg_1',
        label: 'Main Skill',
        enabled: true,
        slot: 'Body Armour',
        gems: [{ instanceId: 'g1', gemId: 'poe1_arc', level: 1, quality: 0, enabled: true }],
      },
    ],
    mainSkillGroupId: 'sg_1',
    items: {},
    equipped: {},
    config: createDefaultConfig(),
    notes: '',
  };
}

export function getSampleBuild(game: GameId): Build {
  return game === 'poe2' ? createSamplePoe2Build() : createSamplePoe1Build();
}
