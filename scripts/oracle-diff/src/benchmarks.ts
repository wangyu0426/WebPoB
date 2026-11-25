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
  {
    id: 'poe1_impale_cyclone_marauder',
    title: 'PoE 1 — Impale Support + Brutality Cyclone Marauder (Hit DPS + Impale DPS + Combined DPS)',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Marauder" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Impale Cyclone"/>
  <Tree activeSpec="1">
    <Spec title="RT" treeVersion="3_30" classId="1" ascendClassId="0" nodes="47175,31628,9511,23881,26523,6446,10221,50422,50570,29353,63282,31961"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Cyclone">
        <Gem gemId="Metadata/Items/Gems/SkillGemCyclone" skillId="Cyclone" nameSpec="Cyclone" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SupportGemImpale" skillId="SupportImpale" nameSpec="Impale" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SupportGemBrutality" skillId="SupportBrutality" nameSpec="Brutality" level="20" quality="0" enabled="true"/>
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
    id: 'poe1_ward_expedition_armour',
    title: 'PoE 1 — Expedition Ward Gear (Runic Crown + Runic Gauntlets + Runic Sabatons)',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Expedition Ward"/>
  <Tree activeSpec="1">
    <Spec title="Default" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447"/>
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
Rune Crown
Runic Crown
Quality: 20
Implicits: 0
+50 to Ward
80% increased Ward
    </Item>
    <Item id="2">
Rarity: RARE
Rune Grip
Runic Gauntlets
Quality: 20
Implicits: 0
+30 to Ward
60% increased Ward
    </Item>
    <Item id="3">
Rarity: RARE
Rune Stride
Runic Sabatons
Quality: 20
Implicits: 0
+40 to Ward
70% increased Ward
    </Item>
    <ItemSet id="1">
      <Slot name="Helmet" itemId="1"/>
      <Slot name="Gloves" itemId="2"/>
      <Slot name="Boots" itemId="3"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_timeless_corrupted_soul_inner_conviction',
    title: 'PoE 1 — Timeless Keystones: Corrupted Soul (Replica Soul Tether) + Inner Conviction (3 Power Charges)',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Timeless Keystones"/>
  <Tree activeSpec="1">
    <Spec title="Default" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447"/>
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
Rarity: UNIQUE
Replica Soul Tether
Cloth Belt
Implicits: 1
20% increased Stun and Block Recovery
+30 to Strength
Gain 6% of Maximum Life as Extra Maximum Energy Shield
Corrupted Soul
    </Item>
    <Item id="2">
Rarity: UNIQUE
Skin of the Lords
Simple Robe
Implicits: 0
Inner Conviction
    </Item>
    <ItemSet id="1">
      <Slot name="Belt" itemId="1"/>
      <Slot name="Body Armour" itemId="2"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1">
    <ConfigSet id="1">
      <Input name="usePowerCharges" boolean="true"/>
    </ConfigSet>
  </Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_coc_trigger_cdr_ice_nova',
    title: 'PoE 1 — Cast On Critical Strike Ice Nova + Cyclone (15% CDR 7.57/s Breakpoint)',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: CoC Ice Nova 15% CDR"/>
  <Tree activeSpec="1">
    <Spec title="Default" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="2" mainActiveSkillCalcs="2" slot="Body Armour" label="CoC Ice Nova">
        <Gem gemId="Metadata/Items/Gems/SkillGemCyclone" skillId="Cyclone" nameSpec="Cyclone" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemIceNova" skillId="IceNova" nameSpec="Ice Nova" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SupportGemCastOnCrit" skillId="SupportCastOnCrit" nameSpec="Cast On Critical Strike" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
CoC Foil
Jewelled Foil
Quality: 20
Implicits: 0
Your Hits can't be Evaded
25% increased Attack Speed
+100% to Critical Strike Chance
    </Item>
    <Item id="2">
Rarity: RARE
Cooldown Belt
Leather Belt
Implicits: 0
15% increased Cooldown Recovery Rate
    </Item>
    <ItemSet id="1">
      <Slot name="Weapon 1" itemId="1"/>
      <Slot name="Belt" itemId="2"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe2_ranger_bow_lightning_arrow',
    title: 'PoE 2 — Lv.90 Ranger w/ 0.5 Tree + Local-Mod Recurve Bow + Lightning Arrow Lv.20',
    game: 'poe2',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="90" targetVersion="0_1" className="Ranger" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: PoE2 Ranger LA"/>
  <Tree activeSpec="1">
    <Spec title="Ranger" treeVersion="0_5" classId="2" classInternalId="2" ascendClassId="0" nodes="50459,13828,56651,1140,49691,35234,38143,15507,31409"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" set1="true" set2="true" label="Lightning Arrow">
        <Gem gemId="Metadata/Items/Gems/SkillGemLightningArrow" skillId="LightningArrowPlayer" nameSpec="Lightning Arrow" variantId="LightningArrow" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Storm Recurve
Recurve Bow
Quality: 20
Implicits: 0
120% increased Physical Damage
Adds 12 to 24 Physical Damage
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
  {
    id: 'poe1_minion_srs_necromancer',
    title: 'PoE 1 — Minion Summon Raging Spirit Lv.20 + Minion Damage + Lord of the Dead + Anger',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: SRS Minion"/>
  <Tree activeSpec="1">
    <Spec title="Minion" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447,57264,37569,36542,4397,11420,60554,27611"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="SRS">
        <Gem gemId="Metadata/Items/Gems/SkillGemSummonRagingSpirit" skillId="SummonRagingSpirit" nameSpec="Summon Raging Spirit" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SupportGemMinionDamage" skillId="SupportMinionDamage" nameSpec="Minion Damage" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Anger">
        <Gem gemId="Metadata/Items/Gems/SkillGemAnger" skillId="Anger" nameSpec="Anger" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_auras_hatred_zealotry_haste',
    title: 'PoE 1 — Ethereal Knives Phys Spell + Hatred (39% Extra Cold) + Zealotry (15% More) + Haste',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: EK Triple Auras"/>
  <Tree activeSpec="1">
    <Spec title="Default" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Ethereal Knives">
        <Gem gemId="Metadata/Items/Gems/SkillGemEtherealKnives" skillId="EtherealKnives" nameSpec="Ethereal Knives" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Auras">
        <Gem gemId="Metadata/Items/Gems/SkillGemHatred" skillId="Hatred" nameSpec="Hatred" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemZealotry" skillId="Zealotry" nameSpec="Zealotry" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemHaste" skillId="Haste" nameSpec="Haste" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_elemental_overload_fireball',
    title: 'PoE 1 — Elemental Overload Keystone (40% more Ele, No Crit Extra) + Fireball Lv.20',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Elemental Overload"/>
  <Tree activeSpec="1">
    <Spec title="EO" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447,57264,37569,36542,4397,7938,14021,55332,22088"/>
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
    id: 'poe1_viper_strike_chaos_claw',
    title: 'PoE 1 — Viper Strike (60% Phys->Chaos) + Local-Mod Imperial Claw + Despair',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Shadow" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Viper Strike Chaos"/>
  <Tree activeSpec="1">
    <Spec title="Shadow" treeVersion="3_30" classId="6" ascendClassId="0" nodes="44683"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Viper Strike">
        <Gem gemId="Metadata/Items/Gems/SkillGemViperStrike" skillId="ViperStrike" nameSpec="Viper Strike" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Curse">
        <Gem gemId="Metadata/Items/Gems/SkillGemDespair" skillId="Despair" nameSpec="Despair" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Venom Talon
Imperial Claw
Quality: 20
Implicits: 0
140% increased Physical Damage
Adds 18 to 34 Physical Damage
20% increased Attack Speed
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
    id: 'poe2_warrior_mace_volcanic_fissure',
    title: 'PoE 2 — Lv.90 Warrior w/ 0.5 Tree + Local-Mod Aberrant Sledge + Volcanic Fissure Lv.20',
    game: 'poe2',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="90" targetVersion="0_1" className="Warrior" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: PoE2 Warrior Volcanic Fissure"/>
  <Tree activeSpec="1">
    <Spec title="Warrior" treeVersion="0_5" classId="6" classInternalId="6" ascendClassId="0" nodes="47175,3936,38646,46325,1913,39581,33556"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" set1="true" set2="true" label="Volcanic Fissure">
        <Gem gemId="Metadata/Items/Gems/SkillGemVolcanicFissure" skillId="VolcanicFissurePlayer" nameSpec="Volcanic Fissure" variantId="VolcanicFissure" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Magma Crusher
Aberrant Sledge
Quality: 20
Implicits: 0
130% increased Physical Damage
Adds 20 to 40 Physical Damage
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
  {
    id: 'poe1_heralds_determination_precision',
    title: 'PoE 1 — Heavy Strike + Determination + Precision + Herald of Ash & Herald of Ice + Rare Vaal Axe',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Duelist" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Heralds + Determination + Precision"/>
  <Tree activeSpec="1">
    <Spec title="Duelist" treeVersion="3_30" classId="4" ascendClassId="0" nodes="50986"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Heavy Strike">
        <Gem gemId="Metadata/Items/Gems/SkillGemHeavyStrike" skillId="HeavyStrike" nameSpec="Heavy Strike" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Auras &amp; Heralds">
        <Gem gemId="Metadata/Items/Gems/SkillGemDetermination" skillId="Determination" nameSpec="Determination" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemPrecision" skillId="Precision" nameSpec="Precision" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemHeraldOfAsh" skillId="HeraldOfAsh" nameSpec="Herald of Ash" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemHeraldOfIce" skillId="HeraldOfIce" nameSpec="Herald of Ice" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Blood Cleaver
Vaal Axe
Quality: 20
Implicits: 0
150% increased Physical Damage
Adds 20 to 40 Physical Damage
18% increased Attack Speed
    </Item>
    <Item id="2">
Rarity: RARE
Iron Carapace
Glorious Plate
Quality: 20
Implicits: 0
+80 to maximum Life
80% increased Armour
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
    id: 'poe1_melee_phys_cruelty_lacerate',
    title: 'PoE 1 — Lacerate + Melee Physical Damage + Brutality + Cruelty + Rare Jewelled Foil',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Duelist" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Lacerate Melee Phys Brutality"/>
  <Tree activeSpec="1">
    <Spec title="Duelist" treeVersion="3_30" classId="4" ascendClassId="0" nodes="50986"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Lacerate">
        <Gem gemId="Metadata/Items/Gems/SkillGemLacerate" skillId="Lacerate" nameSpec="Lacerate" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportMeleePhysicalDamage" skillId="SupportMeleePhysicalDamage" nameSpec="Melee Physical Damage" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportBrutality" skillId="SupportBrutality" nameSpec="Brutality" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportCruelty" skillId="SupportCruelty" nameSpec="Cruelty" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Crimson Needle
Jewelled Foil
Quality: 20
Implicits: 1
+25% to Global Critical Strike Multiplier
150% increased Physical Damage
Adds 18 to 36 Physical Damage
20% increased Attack Speed
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
    id: 'poe1_deadly_ailments_combustion_fireball',
    title: 'PoE 1 — Fireball + Combustion + Deadly Ailments (80% less Hit) + Elemental Focus',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Fireball Deadly Ailments"/>
  <Tree activeSpec="1">
    <Spec title="Witch" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Fireball">
        <Gem gemId="Metadata/Items/Gems/SkillGemFireball" skillId="Fireball" nameSpec="Fireball" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportCombustion" skillId="SupportCombustion" nameSpec="Combustion" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportDeadlyAilments" skillId="SupportDeadlyAilments" nameSpec="Deadly Ailments" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportElementalFocus" skillId="SupportElementalFocus" nameSpec="Elemental Focus" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_void_manipulation_chaos_soulrend',
    title: 'PoE 1 — Soulrend + Void Manipulation + Controlled Destruction + Swift Affliction + Despair',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Soulrend Chaos Supports"/>
  <Tree activeSpec="1">
    <Spec title="Witch" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Soulrend">
        <Gem gemId="Metadata/Items/Gems/SkillGemSoulrend" skillId="Soulrend" nameSpec="Soulrend" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportVoidManipulation" skillId="SupportVoidManipulation" nameSpec="Void Manipulation" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportControlledDestruction" skillId="SupportControlledDestruction" nameSpec="Controlled Destruction" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportSwiftAffliction" skillId="SupportSwiftAffliction" nameSpec="Swift Affliction" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Curse">
        <Gem gemId="Metadata/Items/Gems/SkillGemDespair" skillId="Despair" nameSpec="Despair" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_evasion_suppression_snipers_mark_bow',
    title: 'PoE 1 — Ranger Lightning Arrow + Vicious Projectiles + Added Cold/Lightning + Sniper\'s Mark + Grace + Suppression',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Ranger" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Ranger Bow Mark &amp; Suppression"/>
  <Tree activeSpec="1">
    <Spec title="Ranger" treeVersion="3_30" classId="2" ascendClassId="0" nodes="50459"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Lightning Arrow">
        <Gem gemId="Metadata/Items/Gems/SkillGemLightningArrow" skillId="LightningArrow" nameSpec="Lightning Arrow" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportViciousProjectiles" skillId="SupportViciousProjectiles" nameSpec="Vicious Projectiles" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportAddedColdDamage" skillId="SupportAddedColdDamage" nameSpec="Added Cold Damage" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportAddedLightningDamage" skillId="SupportAddedLightningDamage" nameSpec="Added Lightning Damage" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Aura &amp; Mark">
        <Gem gemId="Metadata/Items/Gems/SkillGemGrace" skillId="Grace" nameSpec="Grace" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSnipersMark" skillId="SnipersMark" nameSpec="Sniper's Mark" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Storm Reach
Imperial Bow
Quality: 20
Implicits: 1
24% increased Elemental Damage with Attack Skills
140% increased Physical Damage
16% increased Attack Speed
    </Item>
    <Item id="2">
Rarity: RARE
Gale Grips
Slink Gloves
Quality: 20
Implicits: 0
+70 to maximum Life
+14% chance to Suppress Spell Damage
80% increased Evasion Rating
    </Item>
    <ItemSet id="1">
      <Slot name="Weapon 1" itemId="1"/>
      <Slot name="Gloves" itemId="2"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_frostbolt_totem_cold_pen',
    title: 'PoE 1 — Templar Frostbolt + Spell Totem + Cold Penetration + Added Cold + Controlled Destruction',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Templar" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Cold Spell Totem"/>
  <Tree activeSpec="1">
    <Spec title="Templar" treeVersion="3_30" classId="5" ascendClassId="0" nodes="61525"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Frostbolt Totem">
        <Gem gemId="Metadata/Items/Gems/SkillGemFrostbolt" skillId="Frostbolt" nameSpec="Frostbolt" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportSpellTotem" skillId="SupportSpellTotem" nameSpec="Spell Totem" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportColdPenetration" skillId="SupportColdPenetration" nameSpec="Cold Penetration" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportAddedColdDamage" skillId="SupportAddedColdDamage" nameSpec="Added Cold Damage" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportControlledDestruction" skillId="SupportControlledDestruction" nameSpec="Controlled Destruction" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe2_sorc_archmage_spark_spirit',
    title: 'PoE 2 — Lv.90 Sorceress Spark + Archmage (100 Spirit, 4% Extra Lightning / 100 Mana) + High-Mana Gear',
    game: 'poe2',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="90" targetVersion="0_1" className="Sorceress" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: PoE2 Archmage Spark"/>
  <Tree activeSpec="1">
    <Spec title="Sorceress" treeVersion="0_5" classId="7" classInternalId="7" ascendClassId="0" nodes="54447,4739,18845"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" set1="true" set2="true" label="Spark">
        <Gem gemId="Metadata/Items/Gems/SkillGemSpark" skillId="SparkPlayer" nameSpec="Spark" variantId="Spark" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" set1="true" set2="true" label="Archmage">
        <Gem gemId="Metadata/Items/Gems/SkillGemArchmage" skillId="ArchmagePlayer" nameSpec="Archmage" variantId="Archmage" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Mind Band
Sapphire Ring
Implicits: 1
+25% to Cold Resistance
+160 to maximum Mana
+30 to Intelligence
    </Item>
    <Item id="2">
Rarity: RARE
Mana Loop
Ruby Ring
Implicits: 1
+25% to Fire Resistance
+140 to maximum Mana
    </Item>
    <ItemSet id="1">
      <Slot name="Ring 1" itemId="1"/>
      <Slot name="Ring 2" itemId="2"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding2>`,
  },
  {
    id: 'poe2_witch_bone_cage_phys_spell',
    title: 'PoE 2 — Lv.90 Witch Bone Cage (Physical Spell, 15% Base Crit) + Spell Crit Rare Gear',
    game: 'poe2',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="90" targetVersion="0_1" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: PoE2 Witch Bone Cage"/>
  <Tree activeSpec="1">
    <Spec title="Witch" treeVersion="0_5" classId="1" classInternalId="1" ascendClassId="0" nodes="54447,4739,18845"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" set1="true" set2="true" label="Bone Cage">
        <Gem gemId="Metadata/Items/Gems/SkillGemBoneCage" skillId="BoneCagePlayer" nameSpec="Bone Cage" variantId="BoneCage" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Ossuary Loop
Topaz Ring
Implicits: 1
+25% to Lightning Resistance
+60 to maximum Life
+25 to Intelligence
    </Item>
    <ItemSet id="1">
      <Slot name="Ring 1" itemId="1"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding2>`,
  },
  {
    id: 'poe2_ranger_poisonburst_arrow_bow',
    title: 'PoE 2 — Lv.90 Ranger Poisonburst Arrow (274% AM) + Local-Mod Rare Gemini Bow',
    game: 'poe2',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="90" targetVersion="0_1" className="Ranger" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: PoE2 Ranger Poisonburst Arrow"/>
  <Tree activeSpec="1">
    <Spec title="Ranger" treeVersion="0_5" classId="2" classInternalId="2" ascendClassId="0" nodes="50459"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" set1="true" set2="true" label="Poisonburst Arrow">
        <Gem gemId="Metadata/Items/Gems/SkillGemPoisonBurstArrow" skillId="PoisonBurstArrowPlayer" nameSpec="Poisonburst Arrow" variantId="PoisonBurstArrow" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Venom Recurve
Gemini Bow
Quality: 20
Implicits: 0
140% increased Physical Damage
Adds 18 to 36 Physical Damage
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
  {
    id: 'poe2_weapon_set2_passives_swap',
    title: 'PoE 2 — Lv.90 Sorceress Weapon Set II Passive Swap (<WeaponSet1> ES vs <WeaponSet2> Spell Dmg)',
    game: 'poe2',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="90" targetVersion="0_1" className="Sorceress" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: PoE2 Weapon Set 2 Passives"/>
  <Tree activeSpec="1">
    <Spec title="WeaponSetSwap" treeVersion="0_5" classId="7" classInternalId="7" ascendClassId="0" nodes="54447,44871,30346,4739,18845">
      <WeaponSet1 nodes="44871,30346"/>
      <WeaponSet2 nodes="4739,18845"/>
    </Spec>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" set1="true" set2="true" label="Fireball">
        <Gem gemId="Metadata/Items/Gems/SkillGemFireball" skillId="FireballPlayer" nameSpec="Fireball" variantId="Fireball" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <ItemSet id="1" useSecondWeaponSet="true"/>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding2>`,
  },
  {
    id: 'poe1_full_dps_multi_srs_20x',
    title: 'PoE 1 — Full DPS: 20x Summon Raging Spirit Minions + Minion Damage + Anger',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: 20x SRS Full DPS"/>
  <Tree activeSpec="1">
    <Spec title="Minion" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447,57264,37569,36542,4397,11420,60554,27611"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" includeInFullDPS="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="20x SRS">
        <Gem gemId="Metadata/Items/Gems/SkillGemSummonRagingSpirit" skillId="SummonRagingSpirit" nameSpec="Summon Raging Spirit" level="20" quality="0" count="20" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SupportGemMinionDamage" skillId="SupportMinionDamage" nameSpec="Minion Damage" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Anger">
        <Gem gemId="Metadata/Items/Gems/SkillGemAnger" skillId="Anger" nameSpec="Anger" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_full_dps_spell_totems_4x',
    title: 'PoE 1 — Full DPS: 4x Arc Spell Totems + Lightning Penetration + Controlled Destruction',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Templar" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: 4x Arc Spell Totems Full DPS"/>
  <Tree activeSpec="1">
    <Spec title="Templar" treeVersion="3_30" classId="5" ascendClassId="0" nodes="61525"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" includeInFullDPS="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="4x Arc Totem">
        <Gem gemId="Metadata/Items/Gems/SkillGemArc" skillId="Arc" nameSpec="Arc" level="20" quality="0" count="4" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportSpellTotem" skillId="SupportSpellTotem" nameSpec="Spell Totem" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportLightningPenetration" skillId="SupportLightningPenetration" nameSpec="Lightning Penetration" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportControlledDestruction" skillId="SupportControlledDestruction" nameSpec="Controlled Destruction" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_ignite_elementalist_fireball_dot',
    title: 'PoE 1 — Elementalist Shaper of Flames Fireball + Combustion + Deadly Ailments + Swift Affliction (Hit & Ignite DPS)',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="Elementalist" mainSocketGroup="1" buildName="Oracle: Elementalist Ignite Fireball"/>
  <Tree activeSpec="1">
    <Spec title="Ignite" treeVersion="3_30" classId="3" ascendClassId="2" nodes="54447,16023,12738,53123"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Ignite Fireball">
        <Gem gemId="Metadata/Items/Gems/SkillGemFireball" skillId="Fireball" nameSpec="Fireball" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportCombustion" skillId="SupportCombustion" nameSpec="Combustion" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportDeadlyAilments" skillId="SupportDeadlyAilments" nameSpec="Deadly Ailments" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportSwiftAffliction" skillId="SupportSwiftAffliction" nameSpec="Swift Affliction" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_bleed_lacerate_deadly_ailments',
    title: 'PoE 1 — Duelist Lacerate + Brutality + Deadly Ailments + Chance to Bleed + Rare Jewelled Foil',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Duelist" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Bleed Lacerate"/>
  <Tree activeSpec="1">
    <Spec title="Duelist" treeVersion="3_30" classId="4" ascendClassId="0" nodes="50986"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Lacerate Bleed">
        <Gem gemId="Metadata/Items/Gems/SkillGemLacerate" skillId="Lacerate" nameSpec="Lacerate" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportBrutality" skillId="SupportBrutality" nameSpec="Brutality" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportDeadlyAilments" skillId="SupportDeadlyAilments" nameSpec="Deadly Ailments" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportChancetoBleed" skillId="SupportChanceToBleed" nameSpec="Chance to Bleed" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Blood Edge
Jewelled Foil
Quality: 20
Implicits: 1
+25% to Global Critical Strike Multiplier
150% increased Physical Damage
Adds 18 to 36 Physical Damage
20% increased Attack Speed
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
    id: 'poe1_herald_of_thunder_wrath_spark',
    title: 'PoE 1 — Spark + Spell Echo + Faster Casting + Wrath + Herald of Thunder',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: Spark Wrath Herald of Thunder"/>
  <Tree activeSpec="1">
    <Spec title="Witch" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Spark">
        <Gem gemId="Metadata/Items/Gems/SkillGemSpark" skillId="Spark" nameSpec="Spark" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportSpellEcho" skillId="SupportSpellEcho" nameSpec="Spell Echo" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportFasterCasting" skillId="SupportFasterCasting" nameSpec="Faster Casting" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Auras &amp; Herald">
        <Gem gemId="Metadata/Items/Gems/SkillGemWrath" skillId="Wrath" nameSpec="Wrath" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemHeraldOfThunder" skillId="HeraldOfThunder" nameSpec="Herald of Thunder" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe1_ci_discipline_high_es_gear',
    title: 'PoE 1 — CI Witch + Discipline + Zealotry + Rare Vaal Regalia & Hubris Circlet + Arc Elemental Focus',
    game: 'poe1',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" bandit="None" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: CI Discipline High-ES"/>
  <Tree activeSpec="1">
    <Spec title="CI" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447,57226,21678,32210,8948,27659,37671,27415,32710,49605,60440,11455"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Body Armour" label="Arc">
        <Gem gemId="Metadata/Items/Gems/SkillGemArc" skillId="Arc" nameSpec="Arc" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemSupportElementalFocus" skillId="SupportElementalFocus" nameSpec="Elemental Focus" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" slot="Helmet" label="Auras">
        <Gem gemId="Metadata/Items/Gems/SkillGemDiscipline" skillId="Discipline" nameSpec="Discipline" level="20" quality="0" enabled="true"/>
        <Gem gemId="Metadata/Items/Gems/SkillGemZealotry" skillId="Zealotry" nameSpec="Zealotry" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Astral Shroud
Vaal Regalia
Quality: 20
Implicits: 0
+90 to maximum Energy Shield
95% increased Energy Shield
+40 to Intelligence
    </Item>
    <Item id="2">
Rarity: RARE
Mind Crown
Hubris Circlet
Quality: 20
Implicits: 0
+65 to maximum Energy Shield
80% increased Energy Shield
    </Item>
    <ItemSet id="1">
      <Slot name="Body Armour" itemId="1"/>
      <Slot name="Helmet" itemId="2"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding>`,
  },
  {
    id: 'poe2_huntress_spear_lightning_spear',
    title: 'PoE 2 — Lv.90 Huntress Lightning Spear (343% AM, 80% Phys->Light) + Local-Mod Rare Akoyan Spear',
    game: 'poe2',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="90" targetVersion="0_1" className="Huntress" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: PoE2 Huntress Lightning Spear"/>
  <Tree activeSpec="1">
    <Spec title="Huntress" treeVersion="0_5" classId="8" classInternalId="8" ascendClassId="0" nodes="50459"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" set1="true" set2="true" label="Lightning Spear">
        <Gem gemId="Metadata/Items/Gems/SkillGemLightningSpear" skillId="LightningSpearPlayer" nameSpec="Lightning Spear" variantId="LightningSpear" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Tempest Pike
Akoyan Spear
Quality: 20
Implicits: 0
140% increased Physical Damage
Adds 16 to 32 Physical Damage
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
  {
    id: 'poe2_druid_volcano_fire_spell',
    title: 'PoE 2 — Lv.90 Druid Volcano (Fire Spell, 8% Base Crit) + Rare Resistance Ring',
    game: 'poe2',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="90" targetVersion="0_1" className="Druid" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: PoE2 Druid Volcano"/>
  <Tree activeSpec="1">
    <Spec title="Druid" treeVersion="0_5" classId="11" classInternalId="11" ascendClassId="0" nodes="61525"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" set1="true" set2="true" label="Volcano">
        <Gem gemId="Metadata/Items/Gems/SkillGemVolcano" skillId="VolcanoPlayer" nameSpec="Volcano" variantId="Volcano" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Ember Band
Ruby Ring
Implicits: 1
+25% to Fire Resistance
+65 to maximum Life
+25 to Strength
    </Item>
    <ItemSet id="1">
      <Slot name="Ring 1" itemId="1"/>
    </ItemSet>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding2>`,
  },
  {
    id: 'poe2_full_dps_dual_spell_sorc',
    title: 'PoE 2 — Full DPS: Lv.90 Sorceress Dual-Skill Spark + Comet Multi-Skill Aggregation',
    game: 'poe2',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="90" targetVersion="0_1" className="Sorceress" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: PoE2 Dual Spell Full DPS"/>
  <Tree activeSpec="1">
    <Spec title="Sorceress" treeVersion="0_5" classId="7" classInternalId="7" ascendClassId="0" nodes="54447,4739,18845"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" includeInFullDPS="true" mainActiveSkill="1" mainActiveSkillCalcs="1" set1="true" set2="true" label="Spark">
        <Gem gemId="Metadata/Items/Gems/SkillGemSpark" skillId="SparkPlayer" nameSpec="Spark" variantId="Spark" level="20" quality="0" count="1" enabled="true"/>
      </Skill>
      <Skill enabled="true" includeInFullDPS="true" mainActiveSkill="1" mainActiveSkillCalcs="1" set1="true" set2="true" label="Comet">
        <Gem gemId="Metadata/Items/Gems/SkillGemComet" skillId="CometPlayer" nameSpec="Comet" variantId="Comet" level="20" quality="0" count="1" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding2>`,
  },
  {
    id: 'poe2_witch_chaos_essence_drain',
    title: 'PoE 2 — Lv.90 Witch Chaos Spell Essence Drain (Chaos [138, 257], 7% Base Crit)',
    game: 'poe2',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="90" targetVersion="0_1" className="Witch" ascendClassName="None" mainSocketGroup="1" buildName="Oracle: PoE2 Witch Essence Drain"/>
  <Tree activeSpec="1">
    <Spec title="Witch" treeVersion="0_5" classId="1" classInternalId="1" ascendClassId="0" nodes="54447,4739,18845"/>
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" set1="true" set2="true" label="Essence Drain">
        <Gem gemId="Metadata/Items/Gems/SkillGemEssenceDrain" skillId="EssenceDrainPlayer" nameSpec="Essence Drain" variantId="EssenceDrain" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1"><ItemSet id="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1"/></Config>
  <Notes/>
</PathOfBuilding2>`,
  },
];
