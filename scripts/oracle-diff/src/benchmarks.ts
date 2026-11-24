import type { GameId } from '@webpob/core';

export interface OracleBenchmarkCase {
  id: string;
  title: string;
  game: GameId;
  /** Official PoB XML compatible with BOTH upstream PathOfBuilding Lua and WebPoB codec. */
  xml: string;
}

export const ORACLE_BENCHMARKS: OracleBenchmarkCase[] = [
  {
    id: 'poe1_naked_witch_fireball',
    title: 'PoE 1 — Naked Lv.90 Witch (Fireball Lv.20, 0Q)',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Naked Witch Fireball"/>
  <Tree activeSpec="1">
    <Spec title="Default" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Fireball">
        <Gem gemId="Metadata/Items/Gems/SkillGemFireball" skillId="Fireball" nameSpec="Fireball" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_tree_witch_arc',
    title: 'PoE 1 — Lv.92 Witch w/ 3.30 Tree + Arc Lv.20',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="92" targetVersion="3_0" bandit="Alira" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Witch 3.30 Tree Arc"/>
  <Tree activeSpec="1">
    <Spec title="Arc Tree" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447,57264,37569,36542,4397,11420,48362,27203,7938,1031,33755,21958,14021,12379,44183,7555,57226,21678,32210,8948,27929,7503,4432,42795"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Arc">
        <Gem gemId="Metadata/Items/Gems/SkillGemArc" skillId="Arc" nameSpec="Arc" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"><Input name="bandit" string="Alira"/></ConfigSet></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_geared_spell_arc',
    title: 'PoE 1 — Geared Lv.92 Witch (Arc + Supports + Wrath + Rare Gear)',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="92" targetVersion="3_0" bandit="Alira" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Geared Spell Arc"/>
  <Tree activeSpec="1">
    <Spec title="Arc Tree" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447,57264,37569,36542,4397,11420,48362,27203,7938,1031,33755,21958,57226,21678,32210,8948"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Main Arc">
        <Gem gemId="Metadata/Items/Gems/SkillGemArc" skillId="Arc" nameSpec="Arc" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SupportGemLightningPenetration" skillId="SupportLightningPenetration" nameSpec="Lightning Penetration" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SupportGemControlledDestruction" skillId="SupportControlledDestruction" nameSpec="Controlled Destruction" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Auras">
        <Gem gemId="Metadata/Items/Gems/SkillGemWrath" skillId="Wrath" nameSpec="Wrath" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Storm Wand
Prophecy Wand
Quality: 0
Implicits: 1
36% increased Spell Damage
65% increased Spell Damage
18% increased Cast Speed
+48 to maximum Mana
    </Item>
    <Item id="2">
Rarity: RARE
Astral Robe
Vaal Regalia
Quality: 20
Implicits: 0
+88 to maximum Life
+42% to Fire Resistance
+38% to Cold Resistance
+36% to Lightning Resistance
    </Item>
    <Item id="3">
Rarity: RARE
Dread Belt
Leather Belt
Quality: 0
Implicits: 1
+40 to maximum Life
+90 to maximum Life
+40% to Fire Resistance
+40% to Cold Resistance
+40% to Lightning Resistance
+40 to Strength
    </Item>
    <ItemSet id="1">
      <Slot name="Weapon 1" itemId="1"/>
      <Slot name="Body Armour" itemId="2"/>
      <Slot name="Belt" itemId="3"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"><Input name="bandit" string="Alira"/></ConfigSet></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_ci_es_witch',
    title: 'PoE 1 — Chaos Inoculation ES Witch + Discipline',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: CI ES Witch"/>
  <Tree activeSpec="1">
    <Spec title="CI" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447,57226,21678,32210,8948,27659,37671,27415,32710,49605,60440,11455"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Arc">
        <Gem gemId="Metadata/Items/Gems/SkillGemArc" skillId="Arc" nameSpec="Arc" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Discipline">
        <Gem gemId="Metadata/Items/Gems/SkillGemDiscipline" skillId="Discipline" nameSpec="Discipline" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Vaal Shell
Vaal Regalia
Quality: 20
Implicits: 0
+16% to all Elemental Resistances
    </Item>
    <ItemSet id="1">
      <Slot name="Body Armour" itemId="1"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_armour_rt_marauder',
    title: 'PoE 1 — Resolute Technique Marauder + Determination + Armour',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="Oak" className="Marauder" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: RT Armour Marauder"/>
  <Tree activeSpec="1">
    <Spec title="RT" treeVersion="3_30" classId="1" ascendClassId="0" nodes="47175,31628,9511,23881,26523,6446,10221,50422,50570,29353,63282,31961,58449,50904,6981,36543,49412,40653,53793,62017,33287"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Cyclone">
        <Gem gemId="Metadata/Items/Gems/SkillGemCyclone" skillId="Cyclone" nameSpec="Cyclone" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SupportGemBrutality" skillId="SupportBrutality" nameSpec="Brutality" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Determination">
        <Gem gemId="Metadata/Items/Gems/SkillGemDetermination" skillId="Determination" nameSpec="Determination" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Brutal Cleaver
Vaal Axe
Quality: 20
Implicits: 0
+30 to Strength
    </Item>
    <Item id="2">
Rarity: RARE
Titan Plate
Glorious Plate
Quality: 20
Implicits: 0
+100 to maximum Life
+40% to Fire Resistance
+40% to Cold Resistance
+40% to Lightning Resistance
    </Item>
    <ItemSet id="1">
      <Slot name="Weapon 1" itemId="1"/>
      <Slot name="Body Armour" itemId="2"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"><Input name="bandit" string="Oak"/></ConfigSet></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_ranger_bow_la',
    title: 'PoE 1 — Lv.90 Ranger Bow Lightning Arrow + Grace',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Ranger" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Ranger Bow LA"/>
  <Tree activeSpec="1">
    <Spec title="Bow" treeVersion="3_30" classId="2" ascendClassId="0" nodes="50459,39821,52904,444,61306,54142,45035,59370,63795,38662,50338,60942,41866,9206,19858"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Weapon 1" label="Lightning Arrow">
        <Gem gemId="Metadata/Items/Gems/SkillGemLightningArrow" skillId="LightningArrow" nameSpec="Lightning Arrow" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SupportGemWeaponElementalDamage" skillId="SupportWeaponElementalDamage" nameSpec="Elemental Damage with Attacks" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Grace">
        <Gem gemId="Metadata/Items/Gems/SkillGemGrace" skillId="Grace" nameSpec="Grace" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Tempest Bow
Spine Bow
Quality: 20
Implicits: 0
+30% to Global Critical Strike Multiplier
    </Item>
    <ItemSet id="1">
      <Slot name="Weapon 1" itemId="1"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe2_naked_sorc_spark',
    title: 'PoE 2 — Naked Lv.90 Sorceress (Spark Lv.20)',
    game: 'poe2',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="90" targetVersion="0_1" className="Sorceress" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: PoE2 Naked Sorceress Spark"/>
  <Tree activeSpec="1">
    <Spec title="Default" treeVersion="0_5" classId="7" classInternalId="7" ascendClassId="0" nodes="54447"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" set1="true" set2="true" label="Spark">
        <Gem gemId="Metadata/Items/Gems/SkillGemSpark" skillId="SparkPlayer" nameSpec="Spark" variantId="Spark" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding2>`,
  },
  {
    id: 'poe2_tree_sorc_spark',
    title: 'PoE 2 — Lv.90 Sorceress w/ 0.5 Tree + Spark Lv.20',
    game: 'poe2',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="90" targetVersion="0_1" className="Sorceress" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: PoE2 Tree Sorc Spark"/>
  <Tree activeSpec="1">
    <Spec title="Tree" treeVersion="0_5" classId="7" classInternalId="7" ascendClassId="0" nodes="54447,44871,30346,29695,43736,2254,13769,59636,4739,18845,1755,41965,51184"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" set1="true" set2="true" label="Spark">
        <Gem gemId="Metadata/Items/Gems/SkillGemSpark" skillId="SparkPlayer" nameSpec="Spark" variantId="Spark" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding2>`,
  },
  {
    id: 'poe1_elementalist_ascendancy',
    title: 'PoE 1 — Lv.92 Elementalist Ascendancy + Lua-Exported Ice Spear + Elemental Focus',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="92" targetVersion="3_0" bandit="Alira" className="Witch" ascendClassName="Elementalist" mainSocketGroup="1" buildName="Oracle: Elementalist Ascendancy Ice Spear"/>
  <Tree activeSpec="1">
    <Spec title="Elementalist" treeVersion="3_30" classId="3" ascendClassId="2" nodes="54447,57264,37569,36542,16023,6052,47873,37114,54279"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Ice Spear">
        <Gem gemId="Metadata/Items/Gems/SkillGemIceSpear" skillId="IceSpear" nameSpec="Ice Spear" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SupportGemElementalFocus" skillId="SupportElementalFocus" nameSpec="Elemental Focus" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"><Input name="bandit" string="Alira"/></ConfigSet></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_utility_flasks_active',
    title: 'PoE 1 — Active Utility Flasks (Granite + Jade + Diamond) + Frostbolt Lv.20',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Utility Flasks"/>
  <Tree activeSpec="1">
    <Spec title="Default" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Frostbolt">
        <Gem gemId="Metadata/Items/Gems/SkillGemFrostbolt" skillId="Frostbolt" nameSpec="Frostbolt" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: MAGIC
Granite Flask
Quality: 0
Implicits: 0
50% increased Armour during effect
    </Item>
    <Item id="2">
Rarity: MAGIC
Jade Flask
Quality: 0
Implicits: 0
45% increased Evasion Rating during effect
    </Item>
    <Item id="3">
Rarity: MAGIC
Diamond Flask
Quality: 0
Implicits: 0
    </Item>
    <ItemSet id="1">
      <Slot name="Flask 1" itemId="1" active="true"/>
      <Slot name="Flask 2" itemId="2" active="true"/>
      <Slot name="Flask 3" itemId="3" active="true"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_mom_hierophant_frostbolt',
    title: 'PoE 1 — Mind Over Matter (40% MoM) + Lua-Exported Frostbolt Lv.21',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: MoM Frostbolt Lv.21"/>
  <Tree activeSpec="1">
    <Spec title="MoM" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447,34098"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Frostbolt">
        <Gem gemId="Metadata/Items/Gems/SkillGemFrostbolt" skillId="Frostbolt" nameSpec="Frostbolt" level="21" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Mind Crown
Hubris Circlet
Quality: 20
Implicits: 0
+120 to maximum Mana
+90 to maximum Life
    </Item>
    <ItemSet id="1">
      <Slot name="Helmet" itemId="1"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe2_comet_sorc',
    title: 'PoE 2 — Lv.90 Sorceress w/ Lua-Exported Comet Lv.20 + Tree',
    game: 'poe2',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="90" targetVersion="0_1" className="Sorceress" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: PoE2 Comet Sorc"/>
  <Tree activeSpec="1">
    <Spec title="Tree" treeVersion="0_5" classId="7" classInternalId="7" ascendClassId="0" nodes="54447,44871,30346,29695,43736,2254,13769"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" set1="true" set2="true" label="Comet">
        <Gem gemId="Metadata/Items/Gems/SkillGemComet" skillId="CometPlayer" nameSpec="Comet" variantId="Comet" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding2>`,
  },
  {
    id: 'poe1_local_weapon_armour_rare',
    title: 'PoE 1 — Local-Mod Rare Vaal Axe (Phys/AS) + Local-Mod Rare Vaal Regalia (ES)',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Marauder" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Local Weapon & Armour"/>
  <Tree activeSpec="1">
    <Spec title="RT" treeVersion="3_30" classId="1" ascendClassId="0" nodes="47175,31628,9511,23881,26523,6446,10221,50422,50570,29353,63282,31961"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Cyclone">
        <Gem gemId="Metadata/Items/Gems/SkillGemCyclone" skillId="Cyclone" nameSpec="Cyclone" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Doom Reaver
Vaal Axe
Quality: 20
Implicits: 0
150% increased Physical Damage
Adds 25 to 45 Physical Damage
20% increased Attack Speed
    </Item>
    <Item id="2">
Rarity: RARE
Aether Vestment
Vaal Regalia
Quality: 20
Implicits: 0
+120 to maximum Energy Shield
110% increased Energy Shield
    </Item>
    <ItemSet id="1">
      <Slot name="Weapon 1" itemId="1"/>
      <Slot name="Body Armour" itemId="2"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_curses_conductivity_assmark',
    title: "PoE 1 — Arc + Conductivity (-36% Light Res) + Assassin's Mark (+1.5% Crit / +49% Multi)",
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Curses & Marks"/>
  <Tree activeSpec="1">
    <Spec title="Default" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Arc">
        <Gem gemId="Metadata/Items/Gems/SkillGemArc" skillId="Arc" nameSpec="Arc" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Curse">
        <Gem gemId="Metadata/Items/Gems/SkillGemConductivity" skillId="Conductivity" nameSpec="Conductivity" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_assassins_mark_spell',
    title: "PoE 1 — Arc + Assassin's Mark (+1.5% Base Crit & +49% Crit Multi)",
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Assassins Mark"/>
  <Tree activeSpec="1">
    <Spec title="Default" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Arc">
        <Gem gemId="Metadata/Items/Gems/SkillGemArc" skillId="Arc" nameSpec="Arc" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Mark">
        <Gem gemId="Metadata/Items/Gems/SkillGemAssassinsMark" skillId="AssassinsMark" nameSpec="Assassin's Mark" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_socketed_jewel_uniques',
    title: "PoE 1 — Socketed Cobalt Jewel + Astramentis + Shavronne's Wrappings",
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Jewel & Uniques"/>
  <Tree activeSpec="1">
    <Spec title="Jewel" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447,57264,37569,36542,4397,31875,60398,7388,36634">
      <Sockets>
        <Socket nodeId="36634" itemId="1"/>
      </Sockets>
    </Spec>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Arc">
        <Gem gemId="Metadata/Items/Gems/SkillGemArc" skillId="Arc" nameSpec="Arc" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Mind Eye
Cobalt Jewel
Implicits: 0
7% increased maximum Life
14% increased Spell Damage
+15% to Global Critical Strike Multiplier
    </Item>
    <Item id="2">
Rarity: UNIQUE
Astramentis
Onyx Amulet
Implicits: 1
+13 to all Attributes
+90 to all Attributes
    </Item>
    <Item id="3">
Rarity: UNIQUE
Shavronne's Wrappings
Occultist's Vestment
Quality: 20
Implicits: 1
6% increased Spell Damage
175% increased Energy Shield
+35% to Lightning Resistance
    </Item>
    <ItemSet id="1">
      <Slot name="Amulet" itemId="2"/>
      <Slot name="Body Armour" itemId="3"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_iron_reflexes_grace',
    title: 'PoE 1 — Iron Reflexes Keystone + Grace + Determination + Active Jade Flask',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Ranger" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Iron Reflexes"/>
  <Tree activeSpec="1">
    <Spec title="IR" treeVersion="3_30" classId="2" ascendClassId="0" nodes="50459,39821,52904,444,61306,60942,32555,22266,30679,5237,6363,29937,8544,10661"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Arc">
        <Gem gemId="Metadata/Items/Gems/SkillGemArc" skillId="Arc" nameSpec="Arc" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Auras">
        <Gem gemId="Metadata/Items/Gems/SkillGemGrace" skillId="Grace" nameSpec="Grace" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemDetermination" skillId="Determination" nameSpec="Determination" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: MAGIC
Jade Flask
Quality: 0
Implicits: 0
    </Item>
    <ItemSet id="1">
      <Slot name="Flask 1" itemId="1" active="true"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_spell_totem_arc',
    title: 'PoE 1 — Spell Totem Support + Arc Lv.20',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Spell Totem Arc"/>
  <Tree activeSpec="1">
    <Spec title="Default" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Arc Totem">
        <Gem gemId="Metadata/Items/Gems/SkillGemArc" skillId="Arc" nameSpec="Arc" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SupportGemSpellTotem" skillId="SupportSpellTotem" nameSpec="Spell Totem" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_avatar_of_fire_frostbolt',
    title: 'PoE 1 — Avatar of Fire Keystone (50% Cold->Fire, Deal no Non-Fire) + Frostbolt',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Avatar of Fire"/>
  <Tree activeSpec="1">
    <Spec title="AoF" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447,57264,37569,36542,4397,31875,60398,13009,17735,58402,10575,29199,15064,31931,15631,44967,50422,10221,44941"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Frostbolt">
        <Gem gemId="Metadata/Items/Gems/SkillGemFrostbolt" skillId="Frostbolt" nameSpec="Frostbolt" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_dual_wield_cyclone',
    title: 'PoE 1 — Dual-Wielding 1H Foil + 1H Axe Cyclone (+10% more AS, +20% Block, alternating)',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Marauder" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Dual Wield Cyclone"/>
  <Tree activeSpec="1">
    <Spec title="DW" treeVersion="3_30" classId="1" ascendClassId="0" nodes="47175,31628,9511,23881,26523,6446,10221,50422,50570,29353,63282,31961"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Cyclone">
        <Gem gemId="Metadata/Items/Gems/SkillGemCyclone" skillId="Cyclone" nameSpec="Cyclone" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Tempest Foil
Jewelled Foil
Quality: 20
Implicits: 1
+25% to Global Critical Strike Multiplier
150% increased Physical Damage
15% increased Attack Speed
    </Item>
    <Item id="2">
Rarity: RARE
Rift Cleaver
Siege Axe
Quality: 20
Implicits: 0
120% increased Physical Damage
10% increased Attack Speed
    </Item>
    <ItemSet id="1">
      <Slot name="Weapon 1" itemId="1"/>
      <Slot name="Weapon 2" itemId="2"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_pain_attunement_low_life',
    title: 'PoE 1 — Pain Attunement Keystone (Low Life 30% more Spell Damage) + Arc',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Pain Attunement Low Life"/>
  <Tree activeSpec="1">
    <Spec title="PA" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447,57226,21678,32210,8948,27659,37671,31703"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Arc">
        <Gem gemId="Metadata/Items/Gems/SkillGemArc" skillId="Arc" nameSpec="Arc" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"><Input name="conditionLowLife" boolean="true"/></ConfigSet></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_wither_despair_soulrend',
    title: 'PoE 1 — Lua-Exported Soulrend Lv.20 + Despair (-30% Chaos Res) + 15x Withered (+90% Taken)',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Wither Despair Soulrend"/>
  <Tree activeSpec="1">
    <Spec title="Default" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Soulrend">
        <Gem gemId="Metadata/Items/Gems/SkillGemSoulrend" skillId="Soulrend" nameSpec="Soulrend" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Curse">
        <Gem gemId="Metadata/Items/Gems/SkillGemDespair" skillId="Despair" nameSpec="Despair" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Gloves" label="Wither">
        <Gem gemId="Metadata/Items/Gems/SkillGemWither" skillId="Wither" nameSpec="Wither" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"><Input name="multiplierWitheredStackCount" number="15"/></ConfigSet></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_exposure_arcane_tailwind_unnerve',
    title: 'PoE 1 — Elementalist Mastermind of Discord (-35% Light Exposure) + Arcane Surge + Tailwind + Unnerve',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="92" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="Elementalist" mainSocketGroup="1" buildName="Oracle: Exposure Arcane Tailwind Unnerve"/>
  <Tree activeSpec="1">
    <Spec title="Elem" treeVersion="3_30" classId="3" ascendClassId="2" nodes="54447,16023,37114,61259"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Arc">
        <Gem gemId="Metadata/Items/Gems/SkillGemArc" skillId="Arc" nameSpec="Arc" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Exposure">
        <Gem gemId="Metadata/Items/Gems/SkillGemHydrosphere" skillId="Hydrosphere" nameSpec="Hydrosphere" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1">
    <ConfigSet id="1">
      <Input name="buffArcaneSurge" boolean="true"/>
      <Input name="buffTailwind" boolean="true"/>
      <Input name="conditionEnemyUnnerved" boolean="true"/>
      <Input name="conditionEnemyLightningExposure" boolean="true"/>
    </ConfigSet>
  </Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_cluster_jewel_large',
    title: 'PoE 1 — Large Lightning Cluster Jewel (Storm Drinker + Prismatic Heart + 4x 12% Small)',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Large Cluster Jewel"/>
  <Tree activeSpec="1">
    <Spec title="Cluster" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447,57226,21678,32210,8948,27659,37671,27415,32710,49605,22618,21033,21984,65888,65890,65893,65895,65894,65898,64583,13170">
      <Sockets>
        <Socket nodeId="21984" itemId="1"/>
      </Sockets>
    </Spec>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Arc">
        <Gem gemId="Metadata/Items/Gems/SkillGemArc" skillId="Arc" nameSpec="Arc" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Storm Cluster
Large Cluster Jewel
Implicits: 3
Adds 8 Passive Skills
2 Added Passive Skills are Jewel Sockets
Added Small Passive Skills grant: 12% increased Lightning Damage
1 Added Passive Skill is Storm Drinker
1 Added Passive Skill is Prismatic Heart
    </Item>
    <ItemSet id="1"/>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe2_monk_quarterstaff_ice_strike',
    title: 'PoE 2 — Lv.90 Monk w/ Local-Mod Gothic Quarterstaff + Ice Strike Lv.20',
    game: 'poe2',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="90" targetVersion="0_1" className="Monk" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: PoE2 Monk Ice Strike"/>
  <Tree activeSpec="1">
    <Spec title="Monk" treeVersion="0_5" classId="10" classInternalId="10" ascendClassId="0" nodes="44683"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" set1="true" set2="true" label="Ice Strike">
        <Gem gemId="Metadata/Items/Gems/SkillGemIceStrike" skillId="IceStrikePlayer" nameSpec="Ice Strike" variantId="IceStrike" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Frost Pillar
Gothic Quarterstaff
Quality: 20
Implicits: 0
120% increased Physical Damage
Adds 15 to 30 Physical Damage
15% increased Attack Speed
    </Item>
    <ItemSet id="1">
      <Slot name="Weapon 1" itemId="1"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding2>`,
  },
];
