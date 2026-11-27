import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileCode2,
  Globe,
  LibraryBig,
  Link2,
  LoaderCircle,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  buildToPobXml,
  encodeBuildToPobCode,
  fetchCharacterProfileBuild,
  fetchRemoteBuildCode,
  fetchWeGamePoe2Build,
  importBuildFromCode,
  isWeGamePoe2ShareUrl,
  parseCharacterJsonToBuild,
  type PoeRealm,
} from '@webpob/codec';
import { t, uiText } from '@webpob/i18n';
import { useWebPobStore } from '../store/useWebPobStore';

// ---------------------------------------------------------------------------
// Curated Build Presets (validated against official PoE 1 3.30 / PoE 2 0.5 data)
// ---------------------------------------------------------------------------
const PRESET_XML: Record<string, string> = {
  'poe1-elementalist-arc': `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="92" targetVersion="3_0" className="Witch" ascendClassName="Elementalist" ascendancyName="Elementalist" mainSocketGroup="1" activeWeaponSet="1" bandit="Alira" buildName="Elementalist Arc" />
  <Tree activeSpec="1">
    <Spec title="Default" treeVersion="3_30" classId="3" ascendClassId="0" nodes="54447,57264,37569,36542,4397,11420,4184,30225,58604,7938,14021,12379,44183,33296,36774,17579,1957,739,57226,59650,9650,25222,19374,6949,31875,60398,7388,47251,10490,22473,3452,40637,21678,32210,8948,27929,2292,33479,47312,55866,1346,11128,48362,18866,21934,60554,34661,44955,12852,1031,33779,34157,367,64401,55332,7555,55643,22062,13009,34098,39648,46340,60648,36634,45175,18359,45680,14211,60090,27659,38176,11659,38900,7503,32024,27203,7614,63976,45317,44723,16790,8135,27611,44983" />
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1" title="Default">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" label="Main 6L Arc" slot="Body Armour">
        <Gem gemId="poe1_arc" level="20" quality="20" enabled="true" />
        <Gem gemId="poe1_sup_spell_echo" level="20" quality="20" enabled="true" />
        <Gem gemId="poe1_sup_lightning_pen" level="20" quality="20" enabled="true" />
        <Gem gemId="poe1_sup_inspiration" level="20" quality="20" enabled="true" />
        <Gem gemId="poe1_sup_increased_crit_damage" level="20" quality="20" enabled="true" />
        <Gem gemId="poe1_sup_faster_casting" level="20" quality="20" enabled="true" />
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" label="Auras" slot="Helmet">
        <Gem gemId="poe1_wrath" level="20" quality="0" enabled="true" />
        <Gem gemId="poe1_discipline" level="20" quality="0" enabled="true" />
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Storm Whisper
Prophecy Wand
Quality: 20
Implicits: 1
38% increased Spell Damage
65% increased Spell Damage
18% increased Cast Speed
60% increased Critical Strike Chance for Spells
+48 to maximum Mana
+1 to Level of all Lightning Spell Skill Gems
    </Item>
    <Item id="2">
Rarity: RARE
Spirit Ward
Titanium Spirit Shield
Quality: 20
Implicits: 0
58% increased Spell Damage
+82 to maximum Life
+32% to Fire Resistance
+36% to Cold Resistance
    </Item>
    <Item id="3">
Rarity: RARE
Storm Crown
Hubris Circlet
Quality: 20
Implicits: 0
+95 to maximum Energy Shield
+75 to maximum Life
+40% to Lightning Resistance
+25% to Chaos Resistance
    </Item>
    <Item id="4">
Rarity: UNIQUE
Inpulsa&apos;s Broken Heart
Sadist Garb
Quality: 20
Implicits: 0
+105 to maximum Life
+45% to Lightning Resistance
40% increased Damage if you have Shocked an Enemy Recently
    </Item>
    <Item id="5">
Rarity: RARE
Gale Grip
Fingerless Silk Gloves
Quality: 20
Implicits: 0
+60 to maximum Life
+40% to Cold Resistance
20% increased Cast Speed
    </Item>
    <Item id="6">
Rarity: RARE
Storm Tread
Sorcerer Boots
Quality: 20
Implicits: 0
+80 to maximum Life
+38% to Fire Resistance
30% increased Movement Speed
    </Item>
    <Item id="7">
Rarity: RARE
Arc Pendant
Onyx Amulet
Quality: 20
Implicits: 1
+12 to all Attributes
+45 to maximum Life
+1 to Level of all Lightning Spell Skill Gems
+30% to Critical Strike Multiplier
    </Item>
    <Item id="8">
Rarity: RARE
Conduct Ring
Gold Ring
Quality: 20
Implicits: 1
+12% to Item Rarity
+70 to maximum Life
+42% to Lightning Resistance
+30 to maximum Mana
    </Item>
    <Item id="9">
Rarity: RARE
Volt Ring
Gold Ring
Quality: 20
Implicits: 1
+12% to Item Rarity
+65 to maximum Life
+45% to Cold Resistance
+35% to Fire Resistance
    </Item>
    <Item id="10">
Rarity: RARE
Storm Belt
Leather Belt
Quality: 20
Implicits: 1
+32 to maximum Life
+95 to maximum Life
+45% to Lightning Resistance
+20% to Chaos Resistance
    </Item>
    <Item id="11">
Rarity: MAGIC
Sulphur Flask
Quality: 20
Implicits: 0
40% increased Damage
    </Item>
    <Item id="12">
Rarity: MAGIC
Basalt Flask
Quality: 20
Implicits: 0
20% more Armour
    </Item>
    <Item id="13">
Rarity: MAGIC
Aquamarine Flask
Quality: 20
Implicits: 0
+30% to Cold Resistance
    </Item>
    <ItemSet id="1" title="Default">
      <Slot name="Weapon 1" itemId="1" />
      <Slot name="Weapon 2" itemId="2" />
      <Slot name="Helmet" itemId="3" />
      <Slot name="Body Armour" itemId="4" />
      <Slot name="Gloves" itemId="5" />
      <Slot name="Boots" itemId="6" />
      <Slot name="Amulet" itemId="7" />
      <Slot name="Ring 1" itemId="8" />
      <Slot name="Ring 2" itemId="9" />
      <Slot name="Belt" itemId="10" />
      <Slot name="Flask 1" itemId="11" active="true" />
      <Slot name="Flask 2" itemId="12" active="true" />
      <Slot name="Flask 3" itemId="13" active="true" />
    </ItemSet>
  </Items>
  <Config activeConfigSet="1">
    <ConfigSet id="1">
      <Input name="enemyLevel" number="84" />
      <Input name="enemyIsBoss" string="Guardian" />
      <Input name="enemyShocked" boolean="true" />
      <Input name="shockValue" number="20" />
    </ConfigSet>
  </Config>
  <Notes>Elementalist Arc endgame preset — Witch / Elementalist Lv.92, 6L Arc + Wrath + Discipline.</Notes>
</PathOfBuilding>`,
  'poe1-berserker-heavy-strike': `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" className="Marauder" ascendClassName="Berserker" ascendancyName="Berserker" mainSocketGroup="1" activeWeaponSet="1" bandit="None" buildName="Berserker Rage Heavy Strike" />
  <Tree activeSpec="1">
    <Spec title="Default" treeVersion="3_30" classId="1" ascendClassId="0" nodes="47175,31628,9511,23881,26523,58449,44606,50862,15405,33740,46910,65034,62021,15073,12702,50904,6981,36543,49412,31080,43374,64816,27140,27301,34959,6884,49178,30733,46578,29292,27718,12809,22627,55485,13714,15868,36047,2913,55913,45646,35192,55002,63048,44908,31931,15064,12536,30693,30691,476,24865,34031,56001,17201,19711,6580,11651,5408,29359,37887,33988,6446,20551,38777,40535,39768,19261,50422,3167,21650,33631,16775,34906,50288,8139,13782,19939,15438,24383,40653,50340,2355" />
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1" title="Default">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" label="Main Heavy Strike" slot="Weapon 1">
        <Gem gemId="poe1_heavystrike" level="20" quality="20" enabled="true" />
        <Gem gemId="poe1_supportrage" level="20" quality="20" enabled="true" />
        <Gem gemId="poe1_supportmeleephysicaldamage" level="20" quality="20" enabled="true" />
        <Gem gemId="poe1_sup_brutality" level="20" quality="20" enabled="true" />
        <Gem gemId="poe1_sup_faster_attacks" level="20" quality="20" enabled="true" />
        <Gem gemId="poe1_sup_impale" level="20" quality="20" enabled="true" />
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" label="Auras" slot="Helmet">
        <Gem gemId="poe1_hatred" level="20" quality="0" enabled="true" />
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Rage Cleaver
Vaal Axe
Quality: 20
Implicits: 1
25% chance to Maim on Hit
160% increased Physical Damage
Adds 35 to 70 Physical Damage
18% increased Attack Speed
+35% to Global Critical Strike Multiplier
    </Item>
    <Item id="2">
Rarity: RARE
Iron Wall
Titanium Spirit Shield
Quality: 20
Implicits: 0
+110 to maximum Life
+45% to Fire Resistance
+30% to Chaos Resistance
    </Item>
    <Item id="3">
Rarity: RARE
Rage Helm
Hubris Circlet
Quality: 20
Implicits: 0
+80 to maximum Life
+45% to Cold Resistance
40% increased Armour
    </Item>
    <Item id="4">
Rarity: RARE
Rage Plate
Glorious Plate
Quality: 20
Implicits: 0
+120 to maximum Life
+45% to Fire Resistance
+45% to Lightning Resistance
110% increased Armour
    </Item>
    <Item id="5">
Rarity: RARE
Rage Grip
Ancient Gauntlets
Quality: 20
Implicits: 0
+70 to maximum Life
+40% to Lightning Resistance
16% increased Attack Speed
    </Item>
    <Item id="6">
Rarity: RARE
Rage Stride
Ancient Greaves
Quality: 20
Implicits: 0
+80 to maximum Life
+38% to Cold Resistance
30% increased Movement Speed
    </Item>
    <Item id="7">
Rarity: RARE
Rage Pendant
Onyx Amulet
Quality: 20
Implicits: 1
+14 to all Attributes
+40 to maximum Life
+35% to Global Critical Strike Multiplier
+30 to Strength
    </Item>
    <Item id="8">
Rarity: RARE
Rage Ring
Gold Ring
Quality: 20
Implicits: 1
+12% to Item Rarity
+70 to maximum Life
+42% to Fire Resistance
+25 to Strength
    </Item>
    <Item id="9">
Rarity: RARE
Fury Ring
Gold Ring
Quality: 20
Implicits: 1
+12% to Item Rarity
+65 to maximum Life
+45% to Cold Resistance
+25 to Strength
    </Item>
    <Item id="10">
Rarity: RARE
Rage Belt
Leather Belt
Quality: 20
Implicits: 1
+34 to maximum Life
+100 to maximum Life
+45% to Lightning Resistance
+25 to Strength
    </Item>
    <Item id="11">
Rarity: MAGIC
Basalt Flask
Quality: 20
Implicits: 0
20% more Armour
    </Item>
    <Item id="12">
Rarity: MAGIC
Stibnite Flask
Quality: 20
Implicits: 0
20% more Evasion Rating
    </Item>
    <ItemSet id="1" title="Default">
      <Slot name="Weapon 1" itemId="1" />
      <Slot name="Weapon 2" itemId="2" />
      <Slot name="Helmet" itemId="3" />
      <Slot name="Body Armour" itemId="4" />
      <Slot name="Gloves" itemId="5" />
      <Slot name="Boots" itemId="6" />
      <Slot name="Amulet" itemId="7" />
      <Slot name="Ring 1" itemId="8" />
      <Slot name="Ring 2" itemId="9" />
      <Slot name="Belt" itemId="10" />
      <Slot name="Flask 1" itemId="11" active="true" />
      <Slot name="Flask 2" itemId="12" active="true" />
    </ItemSet>
  </Items>
  <Config activeConfigSet="1">
    <ConfigSet id="1">
      <Input name="enemyLevel" number="84" />
      <Input name="enemyIsBoss" string="Guardian" />
      <Input name="multiplierRage" number="30" />
    </ConfigSet>
  </Config>
  <Notes>Berserker 30 Rage Heavy Strike preset — Aspect of Carnage + Crave the Slaughter, Vaal Axe.</Notes>
</PathOfBuilding>`,
  'poe1-trickster-ice-spear': `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="90" targetVersion="3_0" className="Shadow" ascendClassName="Trickster" ascendancyName="Trickster" mainSocketGroup="1" activeWeaponSet="1" bandit="None" buildName="Trickster Escape Artist Ice Spear" />
  <Tree activeSpec="1">
    <Spec title="Default" treeVersion="3_30" classId="6" ascendClassId="0" nodes="44683,38129,11334,15549,20546,3656,33783,4502,20852,36585,42649,21301,37671,27659,8948,27929,32024,60554,11420,4184,44955,63639,64501,46136,58649,45272,8640,45838,4011,9355,49978,39861,24496,51786,20812,6534,61320,63799,55247,12189,5875,38176,11551,19635,44723,16790,53493,5823,9877,18865,48778,51923,46092,18033,33545,45456,11688,56153,14157,31371,35894,265,58244,27962,24050,42744,46896,62791,1822,49515,32710,6785,57746,31703,27415,127,51517,32210,11659,40637,55643,38900" />
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1" title="Default">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" label="Main Ice Spear" slot="Body Armour">
        <Gem gemId="poe1_icespear" level="20" quality="20" enabled="true" />
        <Gem gemId="poe1_sup_elemental_focus" level="20" quality="20" enabled="true" />
        <Gem gemId="poe1_supportcoldpenetration" level="20" quality="20" enabled="true" />
        <Gem gemId="poe1_supportaddedcolddamage" level="20" quality="20" enabled="true" />
        <Gem gemId="poe1_sup_faster_casting" level="20" quality="20" enabled="true" />
        <Gem gemId="poe1_sup_inspiration" level="20" quality="20" enabled="true" />
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" label="Auras" slot="Helmet">
        <Gem gemId="poe1_hatred" level="20" quality="0" enabled="true" />
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Frost Whisper
Prophecy Wand
Quality: 20
Implicits: 1
38% increased Spell Damage
70% increased Spell Damage
+1 to Level of all Cold Spell Skill Gems
20% increased Cast Speed
+40 to maximum Mana
    </Item>
    <Item id="2">
Rarity: RARE
Frost Ward
Titanium Spirit Shield
Quality: 20
Implicits: 0
60% increased Spell Damage
+85 to maximum Energy Shield
+35% to Cold Resistance
+30% to Lightning Resistance
    </Item>
    <Item id="3">
Rarity: RARE
Escape Crown
Hubris Circlet
Quality: 20
Implicits: 0
+140 to maximum Energy Shield
+70 to maximum Life
+42% to Cold Resistance
    </Item>
    <Item id="4">
Rarity: RARE
Escape Shroud
Assassin&apos;s Garb
Quality: 20
Implicits: 1
3% increased Movement Speed
+2000 to Evasion Rating
+120 to maximum Life
+45% to Lightning Resistance
+40% to Fire Resistance
    </Item>
    <Item id="5">
Rarity: RARE
Escape Grip
Fingerless Silk Gloves
Quality: 20
Implicits: 0
+70 to maximum Energy Shield
+60 to maximum Life
+38% to Fire Resistance
    </Item>
    <Item id="6">
Rarity: RARE
Escape Stride
Sorcerer Boots
Quality: 20
Implicits: 0
+90 to maximum Energy Shield
+75 to maximum Life
30% increased Movement Speed
    </Item>
    <Item id="7">
Rarity: RARE
Frost Pendant
Onyx Amulet
Quality: 20
Implicits: 1
+13 to all Attributes
+45 to maximum Life
+1 to Level of all Cold Spell Skill Gems
+30% to Critical Strike Multiplier
    </Item>
    <Item id="8">
Rarity: RARE
Frost Ring
Gold Ring
Quality: 20
Implicits: 1
+14% to Item Rarity
+70 to maximum Life
+44% to Cold Resistance
+35 to maximum Energy Shield
    </Item>
    <Item id="9">
Rarity: RARE
Shade Ring
Gold Ring
Quality: 20
Implicits: 1
+14% to Item Rarity
+65 to maximum Life
+45% to Lightning Resistance
+35 to maximum Energy Shield
    </Item>
    <Item id="10">
Rarity: RARE
Escape Belt
Leather Belt
Quality: 20
Implicits: 1
+32 to maximum Life
+95 to maximum Life
+45% to Cold Resistance
+25% to Chaos Resistance
    </Item>
    <Item id="11">
Rarity: MAGIC
Aquamarine Flask
Quality: 20
Implicits: 0
+30% to Cold Resistance
    </Item>
    <Item id="12">
Rarity: MAGIC
Basalt Flask
Quality: 20
Implicits: 0
20% more Armour
    </Item>
    <ItemSet id="1" title="Default">
      <Slot name="Weapon 1" itemId="1" />
      <Slot name="Weapon 2" itemId="2" />
      <Slot name="Helmet" itemId="3" />
      <Slot name="Body Armour" itemId="4" />
      <Slot name="Gloves" itemId="5" />
      <Slot name="Boots" itemId="6" />
      <Slot name="Amulet" itemId="7" />
      <Slot name="Ring 1" itemId="8" />
      <Slot name="Ring 2" itemId="9" />
      <Slot name="Belt" itemId="10" />
      <Slot name="Flask 1" itemId="11" active="true" />
      <Slot name="Flask 2" itemId="12" active="true" />
    </ItemSet>
  </Items>
  <Config activeConfigSet="1">
    <ConfigSet id="1">
      <Input name="enemyLevel" number="84" />
      <Input name="enemyIsBoss" string="Guardian" />
      <Input name="enemyChilled" boolean="true" />
    </ConfigSet>
  </Config>
  <Notes>Trickster Escape Artist Ice Spear preset — high Evasion body + high ES helmet hybrid defence.</Notes>
</PathOfBuilding>`,
  'poe2-stormweaver-spark': `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="90" targetVersion="3_0" className="Sorceress" ascendClassName="Stormweaver" ascendancyName="Stormweaver" mainSocketGroup="1" activeWeaponSet="1" bandit="None" buildName="Stormweaver Archmage Spark" />
  <Tree activeSpec="1">
    <Spec title="Default" treeVersion="0_5" classId="7" ascendClassId="0" nodes="54447,44871,56216,9485,60685,1826,39037,57710,8616,46819,21560,44405,60878,17044,42736,4203,30555,53960,8975,61196,56045,24647,43691,21746,32701,29517,65009,60505,28050,21280,30047,18882,26786,64352,4739,18845,1755,41965,30346,34006,15408,29695,43736,2254,22419,18407,47555,53697,3041,59795,10156,28950,12777,32597,49046,8569,46034,41029,25557,55668,29240,31977,10159,3567,19240,46358,30979,44733,1433,15782,53675,59498,54814,6744,49357,32194,28002,49938,26196,39710,51821,20115,63243,48160,37778,11741,39131,47931,32474,61942,51184,29502,47307" weaponSet1Nodes="" weaponSet2Nodes="" />
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1" title="Default">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" label="Main Spark" slot="Weapon 1" weaponSets="1,2">
        <Gem gemId="poe2_spark" level="20" quality="20" enabled="true" />
        <Gem gemId="poe2_sup_considered_casting" level="20" quality="20" enabled="true" />
        <Gem gemId="poe2_arcanesurgesupport" level="20" quality="20" enabled="true" />
        <Gem gemId="poe2_sup_supercritical" level="20" quality="20" enabled="true" />
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" label="Spirit Buffs" weaponSets="1,2">
        <Gem gemId="poe2_archmage" level="20" quality="0" enabled="true" />
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Voltaic Focus
Attuned Wand
Quality: 20
Implicits: 1
Grants Skill: Level 20 Mana Drain
+4 to Level of all Lightning Spell Skills
100% increased Spell Damage
25% increased Cast Speed
+120 to maximum Mana
    </Item>
    <Item id="2">
Rarity: RARE
Storm Crown
Noble Circlet
Quality: 20
Implicits: 0
+120 to maximum Energy Shield
+80 to maximum Life
+40% to Lightning Resistance
    </Item>
    <Item id="3">
Rarity: RARE
Archmage Robe
Feathered Raiment
Quality: 20
Implicits: 0
+220 to maximum Energy Shield
+100 to maximum Life
+45% to Cold Resistance
+40% to Fire Resistance
    </Item>
    <Item id="4">
Rarity: RARE
Spark Gloves
Adorned Gloves
Quality: 20
Implicits: 0
+90 to maximum Energy Shield
+60 to maximum Life
+38% to Lightning Resistance
    </Item>
    <Item id="5">
Rarity: RARE
Spark Shoes
Bladed Shoes
Quality: 20
Implicits: 0
+90 to maximum Energy Shield
+70 to maximum Life
30% increased Movement Speed
    </Item>
    <Item id="6">
Rarity: RARE
Mana Amulet
Amber Amulet
Quality: 20
Implicits: 0
+60 to maximum Mana
+45 to maximum Life
+30% to Lightning Resistance
+20 to Spirit
    </Item>
    <Item id="7">
Rarity: RARE
Spark Ring
Amethyst Ring
Quality: 20
Implicits: 0
+70 to maximum Life
+42% to Lightning Resistance
+40 to maximum Mana
    </Item>
    <Item id="8">
Rarity: RARE
Storm Ring
Emerald Ring
Quality: 20
Implicits: 0
+65 to maximum Life
+45% to Cold Resistance
+35 to maximum Mana
    </Item>
    <Item id="9">
Rarity: RARE
Mana Belt
Fine Belt
Quality: 20
Implicits: 0
+100 to maximum Life
+45% to Fire Resistance
+50 to maximum Mana
    </Item>
    <ItemSet id="1" title="Default">
      <Slot name="Weapon 1" itemId="1" />
      <Slot name="Helmet" itemId="2" />
      <Slot name="Body Armour" itemId="3" />
      <Slot name="Gloves" itemId="4" />
      <Slot name="Boots" itemId="5" />
      <Slot name="Amulet" itemId="6" />
      <Slot name="Ring 1" itemId="7" />
      <Slot name="Ring 2" itemId="8" />
      <Slot name="Belt" itemId="9" />
    </ItemSet>
  </Items>
  <Config activeConfigSet="1">
    <ConfigSet id="1">
      <Input name="enemyLevel" number="84" />
      <Input name="enemyIsBoss" string="Guardian" />
      <Input name="enemyShocked" boolean="true" />
      <Input name="shockValue" number="30" />
    </ConfigSet>
  </Config>
  <Notes>Stormweaver Archmage Spark preset — +4 Lightning Wand, Spark + Archmage spirit buff.</Notes>
</PathOfBuilding2>`,
  'poe2-ranger-lightning-arrow': `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="90" targetVersion="3_0" className="Ranger" ascendClassName="Deadeye" ascendancyName="Deadeye" mainSocketGroup="1" activeWeaponSet="1" bandit="None" buildName="Ranger Lightning Arrow" />
  <Tree activeSpec="1">
    <Spec title="Default" treeVersion="0_5" classId="2" ascendClassId="0" nodes="50459,56651,35234,6789,4313,35660,18548,28992,13828,49691,31409,50437,1140,15507,48401,35987,38143,43746,16460,24825,29479,34136,13411,48198,29361,17366,10909,16489,48568,26786,42250,16484,22368,29930,37266,63182,5702,24647,56045,61196,12925,36479,64352,44345,48833,15975,62984,21336,49220,33866,7576,13783,22795,43923,50328,61106,61312,29582,29843,19470,55397,59653,6772,60738,50469,44239,55227,24239,55276,26931,39964,65437,40068,18970" weaponSet1Nodes="" weaponSet2Nodes="" />
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1" title="Default">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" label="Main Lightning Arrow" slot="Weapon 1" weaponSets="1,2">
        <Gem gemId="poe2_lightning_arrow" level="20" quality="20" enabled="true" />
        <Gem gemId="poe2_elementalfocussupport" level="20" quality="20" enabled="true" />
        <Gem gemId="poe2_rapidattackssupport" level="20" quality="20" enabled="true" />
        <Gem gemId="poe2_starbornonslaught" level="20" quality="20" enabled="true" />
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" label="Herald" weaponSets="1,2">
        <Gem gemId="poe2_herald_of_thunder" level="20" quality="0" enabled="true" />
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Stormstring
Dualstring Bow
Quality: 20
Implicits: 1
+50% Surpassing chance to fire an additional Arrow
+3 to Level of all Lightning Skills
150% increased Physical Damage
Adds 45 to 90 Lightning Damage
20% increased Attack Speed
    </Item>
    <Item id="2">
Rarity: RARE
Ranger Hood
Desert Circlet
Quality: 20
Implicits: 0
+100 to maximum Life
+45% to Lightning Resistance
40% increased Evasion Rating
    </Item>
    <Item id="3">
Rarity: RARE
Ranger Coat
Vile Robe
Quality: 20
Implicits: 0
+180 to maximum Energy Shield
+110 to maximum Life
+45% to Cold Resistance
+40% to Fire Resistance
    </Item>
    <Item id="4">
Rarity: RARE
Swift Gloves
Baroque Gloves
Quality: 20
Implicits: 0
+80 to maximum Life
+40% to Lightning Resistance
16% increased Attack Speed
    </Item>
    <Item id="5">
Rarity: RARE
Swift Boots
Charmed Shoes
Quality: 20
Implicits: 0
+85 to maximum Life
+38% to Cold Resistance
30% increased Movement Speed
    </Item>
    <Item id="6">
Rarity: RARE
Arrow Amulet
Amber Amulet
Quality: 20
Implicits: 0
+50 to maximum Life
+35% to Global Critical Strike Multiplier
+30 to Dexterity
    </Item>
    <Item id="7">
Rarity: RARE
Arrow Ring
Emerald Ring
Quality: 20
Implicits: 0
+70 to maximum Life
+42% to Lightning Resistance
+30 to Dexterity
    </Item>
    <Item id="8">
Rarity: RARE
Gale Ring
Amethyst Ring
Quality: 20
Implicits: 0
+65 to maximum Life
+45% to Cold Resistance
+25% to Chaos Resistance
    </Item>
    <Item id="9">
Rarity: RARE
Fletch Belt
Heavy Belt
Quality: 20
Implicits: 0
+100 to maximum Life
+45% to Fire Resistance
+30 to Strength
    </Item>
    <ItemSet id="1" title="Default">
      <Slot name="Weapon 1" itemId="1" />
      <Slot name="Helmet" itemId="2" />
      <Slot name="Body Armour" itemId="3" />
      <Slot name="Gloves" itemId="4" />
      <Slot name="Boots" itemId="5" />
      <Slot name="Amulet" itemId="6" />
      <Slot name="Ring 1" itemId="7" />
      <Slot name="Ring 2" itemId="8" />
      <Slot name="Belt" itemId="9" />
    </ItemSet>
  </Items>
  <Config activeConfigSet="1">
    <ConfigSet id="1">
      <Input name="enemyLevel" number="84" />
      <Input name="enemyIsBoss" string="Guardian" />
      <Input name="buffOnslaught" boolean="true" />
    </ConfigSet>
  </Config>
  <Notes>Ranger Lightning Arrow preset — +3 Lightning Bow, Elemental Focus + Rapid Attacks I + Onslaught.</Notes>
</PathOfBuilding2>`,
  'poe2-monk-tempest-flurry': `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="90" targetVersion="3_0" className="Monk" ascendClassName="Invoker" ascendancyName="Invoker" mainSocketGroup="1" activeWeaponSet="1" bandit="None" buildName="Monk Tempest Flurry" />
  <Tree activeSpec="1">
    <Spec title="Default" treeVersion="0_5" classId="10" ascendClassId="0" nodes="44683,10364,55342,17248,53960,49220,52980,44343,55276,13411,34136,29479,50469,32701,26598,54176,55463,27875,30555,4203,49046,8569,47177,11672,40783,15358,10320,14548,3443,55180,42736,60685,1826,39037,57710,4456,34058,59376,46358,30979,44733,10742,8357,18970,17366,29361,48198,15975,59541,2254,13769,59636,3242,51184,22314,22821,56935,60230,10192,3823,42857,7576,33866,8975,4157,14725,44223,21336,36778,58182,5702,24239,24825,44239" weaponSet1Nodes="" weaponSet2Nodes="" />
  </Tree>
  <Skills activeSkillSet="1" defaultGemQuality="0">
    <SkillSet id="1" title="Default">
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" label="Main Tempest Flurry" slot="Weapon 1" weaponSets="1,2">
        <Gem gemId="poe2_tempestflurry" level="20" quality="20" enabled="true" />
        <Gem gemId="poe2_rapidattackssupport" level="20" quality="20" enabled="true" />
        <Gem gemId="poe2_sup_supercritical" level="20" quality="20" enabled="true" />
        <Gem gemId="poe2_starbornonslaught" level="20" quality="20" enabled="true" />
      </Skill>
      <Skill enabled="true" mainActiveSkill="1" mainActiveSkillCalcs="1" label="Spirit Buffs" weaponSets="1,2">
        <Gem gemId="poe2_grim_feast" level="20" quality="0" enabled="true" />
      </Skill>
    </SkillSet>
  </Skills>
  <Items activeItemSet="1">
    <Item id="1">
Rarity: RARE
Stormstaff
Crackling Quarterstaff
Quality: 20
Implicits: 0
Adds 60 to 120 Lightning Damage
180% increased Physical Damage
25% increased Attack Speed
+35% to Global Critical Strike Multiplier
    </Item>
    <Item id="2">
Rarity: RARE
Monk Hood
Druidic Circlet
Quality: 20
Implicits: 0
+100 to maximum Energy Shield
+85 to maximum Life
+42% to Lightning Resistance
    </Item>
    <Item id="3">
Rarity: RARE
Monk Robe
Sacramental Robe
Quality: 20
Implicits: 0
+200 to maximum Energy Shield
+110 to maximum Life
+45% to Cold Resistance
+40% to Fire Resistance
    </Item>
    <Item id="4">
Rarity: RARE
Monk Gloves
Grim Gloves
Quality: 20
Implicits: 0
+90 to maximum Energy Shield
+70 to maximum Life
18% increased Attack Speed
    </Item>
    <Item id="5">
Rarity: RARE
Monk Boots
Quickslip Shoes
Quality: 20
Implicits: 0
+90 to maximum Energy Shield
+80 to maximum Life
30% increased Movement Speed
    </Item>
    <Item id="6">
Rarity: RARE
Monk Amulet
Amber Amulet
Quality: 20
Implicits: 0
+55 to maximum Life
+35% to Global Critical Strike Multiplier
+30 to Dexterity
    </Item>
    <Item id="7">
Rarity: RARE
Monk Ring
Amethyst Ring
Quality: 20
Implicits: 0
+70 to maximum Life
+42% to Lightning Resistance
+30 to maximum Energy Shield
    </Item>
    <Item id="8">
Rarity: RARE
Storm Ring
Emerald Ring
Quality: 20
Implicits: 0
+65 to maximum Life
+45% to Cold Resistance
+30 to maximum Energy Shield
    </Item>
    <Item id="9">
Rarity: RARE
Monk Belt
Fine Belt
Quality: 20
Implicits: 0
+100 to maximum Life
+45% to Fire Resistance
+25% to Chaos Resistance
    </Item>
    <ItemSet id="1" title="Default">
      <Slot name="Weapon 1" itemId="1" />
      <Slot name="Helmet" itemId="2" />
      <Slot name="Body Armour" itemId="3" />
      <Slot name="Gloves" itemId="4" />
      <Slot name="Boots" itemId="5" />
      <Slot name="Amulet" itemId="6" />
      <Slot name="Ring 1" itemId="7" />
      <Slot name="Ring 2" itemId="8" />
      <Slot name="Belt" itemId="9" />
    </ItemSet>
  </Items>
  <Config activeConfigSet="1">
    <ConfigSet id="1">
      <Input name="enemyLevel" number="84" />
      <Input name="enemyIsBoss" string="Guardian" />
      <Input name="buffOnslaught" boolean="true" />
    </ConfigSet>
  </Config>
  <Notes>Monk Tempest Flurry preset — Crackling Quarterstaff + Onslaught spirit buff.</Notes>
</PathOfBuilding2>`,
};

interface CuratedPresetMeta {
  id: string;
  game: 'poe1' | 'poe2';
  titleZh: string;
  titleEn: string;
  roleZh: string;
  roleEn: string;
  tagsZh: string[];
  tagsEn: string[];
}

const CURATED_PRESETS: CuratedPresetMeta[] = [
  {
    id: 'poe1-elementalist-arc',
    game: 'poe1',
    titleZh: '元素使 · 电弧开荒',
    titleEn: 'Elementalist Arc',
    roleZh: '女巫 / 元素使 · Lv.92',
    roleEn: 'Witch / Elementalist · Lv.92',
    tagsZh: ['6L 电弧', '雷霆 + 纪律', '元素使升华', '开荒友好'],
    tagsEn: ['6L Arc', 'Wrath + Discipline', 'Elementalist', 'League starter'],
  },
  {
    id: 'poe1-berserker-heavy-strike',
    game: 'poe1',
    titleZh: '狂战士 · 30 怒火重击',
    titleEn: 'Berserker Rage Heavy Strike',
    roleZh: '野蛮人 / 暴徒 · Lv.90',
    roleEn: 'Marauder / Berserker · Lv.90',
    tagsZh: ['30 怒火', '瓦尔巨斧', '血肉盛宴', '狂怒屠杀'],
    tagsEn: ['30 Rage', 'Vaal Axe', 'Aspect of Carnage', 'Crave the Slaughter'],
  },
  {
    id: 'poe1-trickster-ice-spear',
    game: 'poe1',
    titleZh: '诈欺师 · 逃脱大师冰矛',
    titleEn: 'Trickster Escape Artist Ice Spear',
    roleZh: '暗影刺客 / 欺诈师 · Lv.90',
    roleEn: 'Shadow / Trickster · Lv.90',
    tagsZh: ['逃脱大师', '高闪避胸甲', '高护盾头盔', '冰矛'],
    tagsEn: ['Escape Artist', 'High Evasion Body', 'High ES Helmet', 'Ice Spear'],
  },
  {
    id: 'poe2-stormweaver-spark',
    game: 'poe2',
    titleZh: '风暴编织者 · 大法师电球',
    titleEn: 'Stormweaver Archmage Spark',
    roleZh: '魔巫 / 风暴编织者 · Lv.90',
    roleEn: 'Sorceress / Stormweaver · Lv.90',
    tagsZh: ['电球', '大法师', '+4 闪电法杖', '精魂保留'],
    tagsEn: ['Spark', 'Archmage', '+4 Lightning Wand', 'Spirit reserve'],
  },
  {
    id: 'poe2-ranger-lightning-arrow',
    game: 'poe2',
    titleZh: '游侠 · 闪电箭 +3 弓',
    titleEn: 'Ranger Lightning Arrow',
    roleZh: '游侠 / 锐眼 · Lv.90',
    roleEn: 'Ranger / Deadeye · Lv.90',
    tagsZh: ['闪电箭', '+3 弓', '元素集中', '快速攻击 I', '猛攻'],
    tagsEn: ['Lightning Arrow', '+3 Bow', 'Elemental Focus', 'Rapid Attacks I', 'Onslaught'],
  },
  {
    id: 'poe2-monk-tempest-flurry',
    game: 'poe2',
    titleZh: '武僧 · 疾风骤雨长杖',
    titleEn: 'Monk Tempest Flurry',
    roleZh: '武僧 / 祈求者 · Lv.90',
    roleEn: 'Monk / Invoker · Lv.90',
    tagsZh: ['疾风骤雨', '裂电长杖', '猛攻', '精魂保留'],
    tagsEn: ['Tempest Flurry', 'Crackling Quarterstaff', 'Onslaught', 'Spirit reserve'],
  },
];

export function ImportExportTab() {
  const {
    locale,
    build,
    corsProxyUrl,
    setCorsProxyUrl,
    replaceBuild,
    loadSampleBuild,
    ensureOfficialDataLoaded,
  } = useWebPobStore();

  const [importInput, setImportInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Curated Build Presets Gallery
  const [presetFilter, setPresetFilter] = useState<'all' | 'poe1' | 'poe2'>('all');
  const [presetStatus, setPresetStatus] = useState<{ ok: boolean; presetId: string; text: string } | null>(null);
  const [loadingPresetId, setLoadingPresetId] = useState<string | null>(null);

  // Raw PoB XML Inspector
  const [xmlOpen, setXmlOpen] = useState(false);
  const [xmlCopied, setXmlCopied] = useState(false);

  // Character Profile Importer (GGG International / Tencent CN + Zero-Proxy JSON)
  const [realm, setRealm] = useState<PoeRealm>('pc');
  const [accountName, setAccountName] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [passivesJsonInput, setPassivesJsonInput] = useState('');
  const [itemsJsonInput, setItemsJsonInput] = useState('');
  const [charMsg, setCharMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [charLoading, setCharLoading] = useState(false);

  const shareCode = useMemo(() => encodeBuildToPobCode(build), [build]);
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return `#pob=${shareCode}`;
    return `${window.location.origin}${window.location.pathname}#pob=${shareCode}`;
  }, [shareCode]);
  const xmlPreview = useMemo(() => buildToPobXml(build), [build]);
  const xmlLineCount = useMemo(() => xmlPreview.split('\n').length, [xmlPreview]);
  const xmlByteSize = useMemo(() => new TextEncoder().encode(xmlPreview).length, [xmlPreview]);
  const visiblePresets = useMemo(
    () => (presetFilter === 'all' ? CURATED_PRESETS : CURATED_PRESETS.filter((p) => p.game === presetFilter)),
    [presetFilter],
  );

  const handleLoadPreset = async (preset: CuratedPresetMeta) => {
    const xml = PRESET_XML[preset.id];
    if (!xml) return;
    setLoadingPresetId(preset.id);
    setPresetStatus(null);
    try {
      await ensureOfficialDataLoaded(preset.game);
      const { build: imported } = importBuildFromCode(xml);
      replaceBuild(imported);
      setPresetStatus({
        ok: true,
        presetId: preset.id,
        text:
          uiText(locale, `已加载模板「${preset.titleZh}」：${imported.name}（${imported.tree.allocatedNodeIds.length} 天赋点 / ${Object.keys(imported.equipped).length} 件装备）`, `Loaded "${preset.titleEn}": ${imported.name} (${imported.tree.allocatedNodeIds.length} passives, ${Object.keys(imported.equipped).length} items)`),
      });
    } catch (err) {
      setPresetStatus({
        ok: false,
        presetId: preset.id,
        text:
          uiText(locale, `模板加载失败：${err instanceof Error ? err.message : String(err)}`, `Failed to load preset: ${err instanceof Error ? err.message : String(err)}`),
      });
    } finally {
      setLoadingPresetId(null);
    }
  };

  const handleCopyXml = async () => {
    try {
      await navigator.clipboard.writeText(xmlPreview);
      setXmlCopied(true);
      setTimeout(() => setXmlCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors in restricted contexts
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleImport = async () => {
    const raw = importInput.trim();
    if (!raw) return;
    setLoading(true);
    setMessage(null);
    try {
      const effectiveProxy =
        corsProxyUrl.trim() ||
        (typeof window !== 'undefined' ? `${window.location.origin}/api/proxy` : '');
      if (isWeGamePoe2ShareUrl(raw)) {
        await ensureOfficialDataLoaded('poe2');
        const imported = await fetchWeGamePoe2Build(raw, effectiveProxy);
        replaceBuild(imported);
        setMessage({
          ok: true,
          text:
            uiText(locale, `已导入 WeGame 国服角色：${imported.name}（${imported.tree.allocatedNodeIds.length} 天赋点 / ${Object.keys(imported.equipped).length} 件装备 / ${imported.skills.length} 组技能）`, `Imported WeGame PoE 2 build: ${imported.name} (${imported.tree.allocatedNodeIds.length} passives / ${Object.keys(imported.equipped).length} items / ${imported.skills.length} skill groups)`),
        });
        setImportInput('');
        return;
      }

      let code = raw;
      if (/^https?:\/\//i.test(raw)) {
        code = await fetchRemoteBuildCode(raw, corsProxyUrl);
      }
      const { build: imported } = importBuildFromCode(code);
      if (imported.game !== build.game) {
        await ensureOfficialDataLoaded(imported.game);
      }
      replaceBuild(imported);
      setMessage({ ok: true, text: `${t(locale, 'import.success')} (${imported.name})` });
      setImportInput('');
    } catch (err) {
      setMessage({
        ok: false,
        text: `${t(locale, 'import.error')} ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5 max-w-5xl">
      <h2 className="text-base font-bold text-amber-200">{t(locale, 'import.title')}</h2>

      {/* Export Share Code */}
      <div className="pob-panel rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Upload className="w-4 h-4" />
            {t(locale, 'import.shareCode')}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/40 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Link2 className="w-3.5 h-3.5" />}
              {copiedLink
                ? t(locale, 'import.copied')
                : uiText(locale, '复制直达链接', 'Copy Share URL')}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t(locale, 'import.copied') : t(locale, 'import.copy')}
            </button>
          </div>
        </div>
        <textarea
          readOnly
          rows={3}
          value={shareCode}
          className="pob-input w-full rounded p-2.5 text-[11px] font-mono text-zinc-300 break-all"
        />
      </div>

      {/* Import Code / URL */}
      <div className="pob-panel rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Download className="w-4 h-4" />
            {t(locale, 'import.importBtn')}
          </h3>
          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-200">
            {uiText(locale, '支持 PoB 码 · pobb.in · poe.ninja · maxroll.gg · WeGame 降临助手国服分享链接', 'Supports PoB code · pobb.in · poe.ninja · maxroll.gg · WeGame PoE 2 CN share links')}
          </span>
        </div>
        <textarea
          rows={3}
          value={importInput}
          onChange={(e) => setImportInput(e.target.value)}
          placeholder={t(locale, 'import.pasteCodePlaceholder')}
          className="pob-input w-full rounded p-2.5 text-xs font-mono"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <label className="text-[11px] text-zinc-400 shrink-0">
              {t(locale, 'import.proxyUrl')}:
            </label>
            <input
              type="text"
              value={corsProxyUrl}
              onChange={(e) => setCorsProxyUrl(e.target.value)}
              placeholder="https://your-worker.workers.dev"
              className="pob-input rounded px-2 py-1 text-xs flex-1"
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleImport}
            className="px-4 py-1.5 rounded text-xs font-semibold bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-500/50 cursor-pointer disabled:opacity-50"
          >
            {loading ? '...' : t(locale, 'import.importBtn')}
          </button>
        </div>
        {message && (
          <div className={`text-xs ${message.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Character Profile Importer (GGG International & Tencent CN + Zero-Proxy JSON) */}
      <div className="pob-panel rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
            <Globe className="w-4 h-4" />
            {uiText(locale, '官方角色导入 (GGG 国际服 / 腾讯国服 / 免代理 JSON 导入)', 'Import Character Profile (GGG International / Tencent CN / Direct JSON)')}
          </h3>
          <div className="flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setRealm('pc')}
              className={`px-2 py-0.5 rounded border cursor-pointer ${
                realm === 'pc'
                  ? 'bg-sky-500/20 border-sky-400/60 text-sky-200'
                  : 'bg-[#121623] border-[#252c40] text-zinc-400'
              }`}
            >
              {uiText(locale, '国际服 (pathofexile.com)', 'International (GGG)')}
            </button>
            <button
              type="button"
              onClick={() => setRealm('tencent')}
              className={`px-2 py-0.5 rounded border cursor-pointer ${
                realm === 'tencent'
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                  : 'bg-[#121623] border-[#252c40] text-zinc-400'
              }`}
            >
              {uiText(locale, '国服 (poe.game.qq.com)', 'Tencent CN')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder={uiText(locale, '账号名 (如 Player#1234)', 'Account Name (e.g. Player#1234)')}
            className="pob-input rounded px-2.5 py-1.5 text-xs"
          />
          <input
            type="text"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder={uiText(locale, '角色名 (Character Name)', 'Character Name')}
            className="pob-input rounded px-2.5 py-1.5 text-xs"
          />
          <button
            type="button"
            disabled={charLoading || !accountName.trim() || !characterName.trim()}
            onClick={async () => {
              setCharLoading(true);
              setCharMsg(null);
              try {
                const imported = await fetchCharacterProfileBuild({
                  realm,
                  accountName,
                  characterName,
                  game: build.game,
                  corsProxyBase: corsProxyUrl,
                });
                replaceBuild(imported);
                setCharMsg({
                  ok: true,
                  text:
                    uiText(locale, `已导入角色 ${imported.name} (${imported.tree.allocatedNodeIds.length} 天赋点 / ${Object.keys(imported.equipped).length} 件装备)`, `Imported ${imported.name} (${imported.tree.allocatedNodeIds.length} passives, ${Object.keys(imported.equipped).length} items)`),
                });
              } catch (err) {
                setCharMsg({
                  ok: false,
                  text: err instanceof Error ? err.message : String(err),
                });
              } finally {
                setCharLoading(false);
              }
            }}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/50 cursor-pointer disabled:opacity-50"
          >
            {charLoading
              ? '...'
              : uiText(locale, '在线拉取角色 (需代理)', 'Fetch Character (via Proxy)')}
          </button>
        </div>

        <details className="rounded bg-[#0b0e15] border border-[#22283a] p-3 space-y-2">
          <summary className="text-[11px] font-semibold text-zinc-300 cursor-pointer">
            {uiText(locale, '免代理直连：粘贴官网 get-passive-skills / get-items JSON 导入', 'Zero-Proxy Mode: Paste get-passive-skills / get-items JSON directly')}
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
            <textarea
              rows={3}
              value={passivesJsonInput}
              onChange={(e) => setPassivesJsonInput(e.target.value)}
              placeholder='{"hashes":[54447,57264,...]} (get-passive-skills JSON)'
              className="pob-input rounded p-2 text-[11px] font-mono"
            />
            <textarea
              rows={3}
              value={itemsJsonInput}
              onChange={(e) => setItemsJsonInput(e.target.value)}
              placeholder='{"character":{"name":"...","class":"Elementalist","level":95},"items":[...]} (get-items JSON)'
              className="pob-input rounded p-2 text-[11px] font-mono"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!passivesJsonInput.trim() && !itemsJsonInput.trim()}
              onClick={() => {
                setCharMsg(null);
                try {
                  const imported = parseCharacterJsonToBuild({
                    game: build.game,
                    characterName: characterName.trim() || undefined,
                    passivesJson: passivesJsonInput.trim() || undefined,
                    itemsJson: itemsJsonInput.trim() || undefined,
                  });
                  replaceBuild(imported);
                  setPassivesJsonInput('');
                  setItemsJsonInput('');
                  setCharMsg({
                    ok: true,
                    text:
                      uiText(locale, `JSON 导入成功：${imported.name} (${imported.tree.allocatedNodeIds.length} 天赋点 / ${Object.keys(imported.equipped).length} 装备)`, `Imported from JSON: ${imported.name} (${imported.tree.allocatedNodeIds.length} passives, ${Object.keys(imported.equipped).length} items)`),
                  });
                } catch (err) {
                  setCharMsg({
                    ok: false,
                    text: `JSON Error: ${err instanceof Error ? err.message : String(err)}`,
                  });
                }
              }}
              className="px-3 py-1 rounded text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 cursor-pointer disabled:opacity-50"
            >
              {uiText(locale, '解析 JSON 并导入角色', 'Parse & Import Character JSON')}
            </button>
          </div>
        </details>

        {charMsg && (
          <div className={`text-xs ${charMsg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
            {charMsg.text}
          </div>
        )}
      </div>

      {/* Curated Build Presets Gallery */}
      <div className="pob-panel rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <LibraryBig className="w-4 h-4" />
            {uiText(locale, '经典构筑模板库（一键加载）', 'Curated Build Presets')}
            <span className="text-[10px] font-mono font-normal text-zinc-500">
              ({visiblePresets.length}/{CURATED_PRESETS.length})
            </span>
          </h3>
          <div className="flex items-center gap-1 text-[11px]">
            {([
              ['all', uiText(locale, '全部', 'All')],
              ['poe1', 'PoE 1'],
              ['poe2', 'PoE 2'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPresetFilter(key)}
                className={`px-2.5 py-0.5 rounded-full border cursor-pointer transition ${
                  presetFilter === key
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                    : 'bg-[#121623] border-[#252c40] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {visiblePresets.map((preset) => {
            const isPoe2 = preset.game === 'poe2';
            const loadingThis = loadingPresetId === preset.id;
            const status = presetStatus?.presetId === preset.id ? presetStatus : null;
            return (
              <div
                key={preset.id}
                className={`rounded-md border bg-[#0f131e] p-3 space-y-2 transition ${
                  status?.ok
                    ? 'border-emerald-500/50'
                    : isPoe2
                      ? 'border-sky-500/30 hover:border-sky-400/60'
                      : 'border-amber-500/30 hover:border-amber-400/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                          isPoe2
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {preset.game === 'poe1' ? 'PoE 1 · 3.30' : 'PoE 2 · 0.5'}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-zinc-100 mt-1 truncate">
                      {uiText(locale, preset.titleZh, preset.titleEn)}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {uiText(locale, preset.roleZh, preset.roleEn)}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={loadingPresetId !== null}
                    onClick={() => void handleLoadPreset(preset)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border shrink-0 cursor-pointer transition disabled:opacity-50 ${
                      isPoe2
                        ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border-sky-500/50'
                        : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/50'
                    }`}
                  >
                    {loadingThis ? (
                      <LoaderCircle className="w-3 h-3 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                    {loadingThis
                      ? uiText(locale, '加载中', 'Loading')
                      : uiText(locale, '加载模板', 'Load')}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1">
                  {(locale === 'en'
                    ? preset.tagsEn
                    : preset.tagsZh.map((tag) => uiText(locale, tag, tag))
                  ).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[#161c2b] border border-[#2a3147] text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {status && (
                  <div
                    className={`flex items-start gap-1 text-[11px] ${
                      status.ok ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {status.ok ? (
                      <BadgeCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    )}
                    <span>{status.text}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-[10px] text-zinc-500">
          {uiText(locale, '每个模板都经过官方 PoE 1 3.30 / PoE 2 0.5 数据校验，加载后可直接在天赋树、技能与装备页继续微调。', 'Every preset is validated against official PoE 1 3.30 / PoE 2 0.5 data; refine it further on the Tree, Skills and Items tabs after loading.')}
        </div>
      </div>

      {/* Quick Sample Builds */}
      <div className="pob-panel rounded-lg p-4 space-y-2.5">
        <h3 className="text-xs font-bold text-amber-300">{t(locale, 'import.sampleBuilds')}</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadSampleBuild('poe1')}
            className="px-3 py-1.5 rounded text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-200 border border-amber-500/40 cursor-pointer"
          >
            PoE 1 — Elementalist Arc (女巫元素使电弧)
          </button>
          <button
            type="button"
            onClick={() => loadSampleBuild('poe2')}
            className="px-3 py-1.5 rounded text-xs bg-sky-600/20 hover:bg-sky-600/30 text-sky-200 border border-sky-500/40 cursor-pointer"
          >
            PoE 2 — Stormweaver Archmage Spark (魔巫大法师电球)
          </button>
        </div>
      </div>

      {/* Raw PoB XML Inspector */}
      <div className="pob-panel rounded-lg p-4 space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setXmlOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-200 cursor-pointer"
          >
            {xmlOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <FileCode2 className="w-4 h-4 text-sky-300" />
            {uiText(locale, '查看 / 复制 PoB XML 源码', 'Inspect Raw PoB XML')}
          </button>
          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
            <span>{uiText(locale, `${xmlLineCount} 行`, `${xmlLineCount} lines`)}</span>
            <span className="text-zinc-600">·</span>
            <span>
              {(xmlByteSize / 1024).toFixed(2)} KB ({xmlByteSize.toLocaleString()} B)
            </span>
            <button
              type="button"
              onClick={() => void handleCopyXml()}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-500/40 cursor-pointer"
            >
              {xmlCopied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
              {xmlCopied
                ? uiText(locale, '已复制', 'Copied')
                : uiText(locale, '复制 XML', 'Copy XML')}
            </button>
          </div>
        </div>
        {xmlOpen && (
          <pre className="p-3 rounded bg-[#0a0c12] border border-[#222838] text-[11px] font-mono text-zinc-400 overflow-auto max-h-96 leading-relaxed">
            {xmlPreview}
          </pre>
        )}
      </div>
    </div>
  );
}
