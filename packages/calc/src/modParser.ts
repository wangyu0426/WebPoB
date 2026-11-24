import { KeywordFlag, ModFlag, type Mod, type ModType } from '@webpob/core';
import { normalizeStatLineToEn } from '@webpob/i18n';

function mkMod(
  name: string,
  type: ModType,
  value: number | boolean | string,
  source: string,
  flags = 0,
  keywordFlags = 0,
): Mod {
  return { name, type, value, flags, keywordFlags, source };
}

interface ParserRule {
  pattern: RegExp;
  build: (match: RegExpMatchArray, source: string) => Mod[];
}

const PARSER_RULES: ParserRule[] = [
  // Flat Resources
  {
    pattern: /^\+(\d+) to maximum Life$/i,
    build: (m, src) => [mkMod('Life', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^\+(\d+) to maximum Mana$/i,
    build: (m, src) => [mkMod('Mana', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^\+(\d+) to maximum Energy Shield$/i,
    build: (m, src) => [mkMod('EnergyShield', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^\+(\d+) to Spirit$/i,
    build: (m, src) => [mkMod('Spirit', 'BASE', Number(m[1]), src)],
  },
  // % Resources & Defences
  {
    pattern: /^(\d+)% increased maximum Life$/i,
    build: (m, src) => [mkMod('Life', 'INC', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% more maximum Life$/i,
    build: (m, src) => [mkMod('Life', 'MORE', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% increased (?:maximum )?Energy Shield$/i,
    build: (m, src) => [mkMod('EnergyShield', 'INC', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% more (?:maximum )?Energy Shield$/i,
    build: (m, src) => [mkMod('EnergyShield', 'MORE', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% increased maximum Mana$/i,
    build: (m, src) => [mkMod('Mana', 'INC', Number(m[1]), src)],
  },
  {
    pattern: /^\+(\d+) to Armour$/i,
    build: (m, src) => [mkMod('Armour', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% increased Armour$/i,
    build: (m, src) => [mkMod('Armour', 'INC', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% more Armour$/i,
    build: (m, src) => [mkMod('Armour', 'MORE', Number(m[1]), src)],
  },
  {
    pattern: /^\+(\d+) to Evasion Rating$/i,
    build: (m, src) => [mkMod('Evasion', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% increased Evasion Rating$/i,
    build: (m, src) => [mkMod('Evasion', 'INC', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% more Evasion Rating$/i,
    build: (m, src) => [mkMod('Evasion', 'MORE', Number(m[1]), src)],
  },
  // Attributes (single, dual, all, and PoE 2 "any Attribute")
  {
    pattern: /^\+(\d+) to Strength$/i,
    build: (m, src) => [mkMod('Str', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^\+(\d+) to Dexterity$/i,
    build: (m, src) => [mkMod('Dex', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^\+(\d+) to Intelligence$/i,
    build: (m, src) => [mkMod('Int', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^\+(\d+) to Strength and Dexterity$/i,
    build: (m, src) => [
      mkMod('Str', 'BASE', Number(m[1]), src),
      mkMod('Dex', 'BASE', Number(m[1]), src),
    ],
  },
  {
    pattern: /^\+(\d+) to Strength and Intelligence$/i,
    build: (m, src) => [
      mkMod('Str', 'BASE', Number(m[1]), src),
      mkMod('Int', 'BASE', Number(m[1]), src),
    ],
  },
  {
    pattern: /^\+(\d+) to Dexterity and Intelligence$/i,
    build: (m, src) => [
      mkMod('Dex', 'BASE', Number(m[1]), src),
      mkMod('Int', 'BASE', Number(m[1]), src),
    ],
  },
  {
    pattern: /^\+(\d+) to (?:all Attributes|any Attribute)$/i,
    build: (m, src) => {
      const v = Number(m[1]);
      return [
        mkMod('Str', 'BASE', v, src),
        mkMod('Dex', 'BASE', v, src),
        mkMod('Int', 'BASE', v, src),
      ];
    },
  },
  // Hybrid Defences common on official PoE 1 & PoE 2 trees
  {
    pattern: /^(\d+)% increased Armour and Energy Shield$/i,
    build: (m, src) => [
      mkMod('Armour', 'INC', Number(m[1]), src),
      mkMod('EnergyShield', 'INC', Number(m[1]), src),
    ],
  },
  {
    pattern: /^(\d+)% increased Evasion and Energy Shield$/i,
    build: (m, src) => [
      mkMod('Evasion', 'INC', Number(m[1]), src),
      mkMod('EnergyShield', 'INC', Number(m[1]), src),
    ],
  },
  {
    pattern: /^(\d+)% increased Armour and Evasion$/i,
    build: (m, src) => [
      mkMod('Armour', 'INC', Number(m[1]), src),
      mkMod('Evasion', 'INC', Number(m[1]), src),
    ],
  },
  {
    pattern: /^(\d+)% increased Mana Regeneration Rate$/i,
    build: (m, src) => [mkMod('ManaRegen', 'INC', Number(m[1]), src)],
  },
  // Resistances
  {
    pattern: /^([+-]?\d+)% to all Elemental Resistances$/i,
    build: (m, src) => {
      const v = Number(m[1]);
      return [
        mkMod('FireResist', 'BASE', v, src),
        mkMod('ColdResist', 'BASE', v, src),
        mkMod('LightningResist', 'BASE', v, src),
      ];
    },
  },
  {
    pattern: /^\+(\d+)% to maximum (Fire|Cold|Lightning|Chaos) Resistance$/i,
    build: (m, src) => [mkMod(`${m[2]}ResistMax`, 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^([+-]?\d+)% to (Fire|Cold|Lightning|Chaos) Resistance$/i,
    build: (m, src) => [mkMod(`${m[2]}Resist`, 'BASE', Number(m[1]), src)],
  },
  // Block, Suppression, Regen, Move Speed, Accuracy
  {
    pattern: /^\+(\d+)% Chance to Block Attack Damage$/i,
    build: (m, src) => [mkMod('BlockChance', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^\+(\d+)% Chance to Block Spell Damage$/i,
    build: (m, src) => [mkMod('SpellBlockChance', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^\+(\d+)% chance to Suppress Spell Damage$/i,
    build: (m, src) => [mkMod('SpellSuppressionChance', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^Regenerate (\d+(?:\.\d+)?) Life per second$/i,
    build: (m, src) => [mkMod('LifeRegen', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^Regenerate (\d+(?:\.\d+)?)% of Life per second$/i,
    build: (m, src) => [mkMod('LifeRegenPercent', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% increased Movement Speed$/i,
    build: (m, src) => [mkMod('MovementSpeed', 'INC', Number(m[1]), src)],
  },
  {
    pattern: /^\+(\d+) to Accuracy Rating$/i,
    build: (m, src) => [mkMod('Accuracy', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% increased Accuracy Rating$/i,
    build: (m, src) => [mkMod('Accuracy', 'INC', Number(m[1]), src)],
  },
  // Added Damage (Global, Spell, Attack)
  {
    pattern: /^Adds (\d+) to (\d+) (Physical|Fire|Cold|Lightning|Chaos) Damage to Spells$/i,
    build: (m, src) => [
      mkMod(`${m[3]}Min`, 'BASE', Number(m[1]), src, ModFlag.Spell),
      mkMod(`${m[3]}Max`, 'BASE', Number(m[2]), src, ModFlag.Spell),
    ],
  },
  {
    pattern: /^Adds (\d+) to (\d+) (Physical|Fire|Cold|Lightning|Chaos) Damage to Attacks$/i,
    build: (m, src) => [
      mkMod(`${m[3]}Min`, 'BASE', Number(m[1]), src, ModFlag.Attack),
      mkMod(`${m[3]}Max`, 'BASE', Number(m[2]), src, ModFlag.Attack),
    ],
  },
  {
    pattern: /^Adds (\d+) to (\d+) (Physical|Fire|Cold|Lightning|Chaos) Damage$/i,
    build: (m, src) => [
      mkMod(`${m[3]}Min`, 'BASE', Number(m[1]), src),
      mkMod(`${m[3]}Max`, 'BASE', Number(m[2]), src),
    ],
  },
  // Damage Conversion & Gained as Extra
  {
    pattern: /^(\d+)% of Physical Damage Converted to (Fire|Cold|Lightning|Chaos) Damage$/i,
    build: (m, src) => [mkMod(`PhysicalDamageConvertTo${m[2]}`, 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^Gain (\d+)% of Physical Damage as Extra (Fire|Cold|Lightning|Chaos) Damage$/i,
    build: (m, src) => [mkMod(`PhysicalDamageGainAs${m[2]}`, 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^Gain (\d+)% of Elemental Damage as Extra Chaos Damage$/i,
    build: (m, src) => [mkMod('ElementalDamageGainAsChaos', 'BASE', Number(m[1]), src)],
  },
  // Damage Increased / More / Less
  {
    pattern: /^(\d+)% (increased|more|less) (Physical|Fire|Cold|Lightning|Chaos|Elemental) Damage with Attack Skills$/i,
    build: (m, src) => {
      const val = m[2]!.toLowerCase() === 'less' ? -Number(m[1]) : Number(m[1]);
      const type: ModType = m[2]!.toLowerCase() === 'increased' ? 'INC' : 'MORE';
      return [mkMod(`${m[3]}Damage`, type, val, src, ModFlag.Attack)];
    },
  },
  {
    pattern: /^(\d+)% (increased|more|less) (Physical|Fire|Cold|Lightning|Chaos|Elemental) Damage$/i,
    build: (m, src) => {
      const val = m[2]!.toLowerCase() === 'less' ? -Number(m[1]) : Number(m[1]);
      const type: ModType = m[2]!.toLowerCase() === 'increased' ? 'INC' : 'MORE';
      return [mkMod(`${m[3]}Damage`, type, val, src)];
    },
  },
  {
    pattern: /^(\d+)% (increased|more|less) Spell Damage$/i,
    build: (m, src) => {
      const val = m[2]!.toLowerCase() === 'less' ? -Number(m[1]) : Number(m[1]);
      const type: ModType = m[2]!.toLowerCase() === 'increased' ? 'INC' : 'MORE';
      return [mkMod('Damage', type, val, src, ModFlag.Spell)];
    },
  },
  {
    pattern: /^(\d+)% (increased|more|less) Attack Damage$/i,
    build: (m, src) => {
      const val = m[2]!.toLowerCase() === 'less' ? -Number(m[1]) : Number(m[1]);
      const type: ModType = m[2]!.toLowerCase() === 'increased' ? 'INC' : 'MORE';
      return [mkMod('Damage', type, val, src, ModFlag.Attack)];
    },
  },
  {
    pattern: /^(\d+)% (increased|more|less) Projectile Damage$/i,
    build: (m, src) => {
      const val = m[2]!.toLowerCase() === 'less' ? -Number(m[1]) : Number(m[1]);
      const type: ModType = m[2]!.toLowerCase() === 'increased' ? 'INC' : 'MORE';
      return [mkMod('Damage', type, val, src, ModFlag.Projectile)];
    },
  },
  {
    pattern: /^(\d+)% (increased|more|less) Melee Physical Damage$/i,
    build: (m, src) => {
      const val = m[2]!.toLowerCase() === 'less' ? -Number(m[1]) : Number(m[1]);
      const type: ModType = m[2]!.toLowerCase() === 'increased' ? 'INC' : 'MORE';
      return [mkMod('PhysicalDamage', type, val, src, ModFlag.Melee)];
    },
  },
  {
    pattern: /^(\d+)% (increased|more|less) Melee Damage$/i,
    build: (m, src) => {
      const val = m[2]!.toLowerCase() === 'less' ? -Number(m[1]) : Number(m[1]);
      const type: ModType = m[2]!.toLowerCase() === 'increased' ? 'INC' : 'MORE';
      return [mkMod('Damage', type, val, src, ModFlag.Melee)];
    },
  },
  {
    pattern: /^(\d+)% (increased|more|less) Area Damage$/i,
    build: (m, src) => {
      const val = m[2]!.toLowerCase() === 'less' ? -Number(m[1]) : Number(m[1]);
      const type: ModType = m[2]!.toLowerCase() === 'increased' ? 'INC' : 'MORE';
      return [mkMod('Damage', type, val, src, ModFlag.Area)];
    },
  },
  {
    pattern: /^(\d+)% (increased|more|less) Damage$/i,
    build: (m, src) => {
      const val = m[2]!.toLowerCase() === 'less' ? -Number(m[1]) : Number(m[1]);
      const type: ModType = m[2]!.toLowerCase() === 'increased' ? 'INC' : 'MORE';
      return [mkMod('Damage', type, val, src)];
    },
  },
  // Speed (including element-specific Cast/Attack speed on official trees)
  {
    pattern: /^(\d+)% (increased|more|less) Attack and Cast Speed$/i,
    build: (m, src) => {
      const val = m[2]!.toLowerCase() === 'less' ? -Number(m[1]) : Number(m[1]);
      const type: ModType = m[2]!.toLowerCase() === 'increased' ? 'INC' : 'MORE';
      return [
        mkMod('Speed', type, val, src, ModFlag.Attack),
        mkMod('Speed', type, val, src, ModFlag.Spell),
      ];
    },
  },
  {
    pattern: /^(\d+)% (increased|more|less) Attack Speed(?: with .+)?$/i,
    build: (m, src) => {
      const val = m[2]!.toLowerCase() === 'less' ? -Number(m[1]) : Number(m[1]);
      const type: ModType = m[2]!.toLowerCase() === 'increased' ? 'INC' : 'MORE';
      return [mkMod('Speed', type, val, src, ModFlag.Attack)];
    },
  },
  {
    pattern: /^(\d+)% (increased|more|less) Cast Speed(?: with (Fire|Cold|Lightning|Chaos|Physical) Skills)?$/i,
    build: (m, src) => {
      const val = m[2]!.toLowerCase() === 'less' ? -Number(m[1]) : Number(m[1]);
      const type: ModType = m[2]!.toLowerCase() === 'increased' ? 'INC' : 'MORE';
      const el = m[3];
      const kw =
        el === 'Fire'
          ? KeywordFlag.Fire
          : el === 'Cold'
            ? KeywordFlag.Cold
            : el === 'Lightning'
              ? KeywordFlag.Lightning
              : el === 'Chaos'
                ? KeywordFlag.Chaos
                : el === 'Physical'
                  ? KeywordFlag.Physical
                  : 0;
      return [mkMod('Speed', type, val, src, ModFlag.Spell, kw)];
    },
  },
  // Critical Strikes (PoE 1 & PoE 2 terminology)
  {
    pattern: /^(\d+)% (more|less) Critical Strike Chance$/i,
    build: (m, src) => [
      mkMod('CritChance', 'MORE', m[2]!.toLowerCase() === 'less' ? -Number(m[1]) : Number(m[1]), src),
    ],
  },
  {
    pattern: /^(\d+)% increased (?:Critical Strike|Critical Hit) Chance for Spells$/i,
    build: (m, src) => [mkMod('CritChance', 'INC', Number(m[1]), src, ModFlag.Spell)],
  },
  {
    pattern: /^(\d+)% increased Spell Critical (?:Strike|Hit) Chance$/i,
    build: (m, src) => [mkMod('CritChance', 'INC', Number(m[1]), src, ModFlag.Spell)],
  },
  {
    pattern: /^(\d+)% increased (?:Global )?(?:Critical Strike|Critical Hit) Chance$/i,
    build: (m, src) => [mkMod('CritChance', 'INC', Number(m[1]), src)],
  },
  {
    pattern: /^\+(\d+)% to (?:Global )?(?:Critical Strike Multiplier|Critical Damage Bonus)$/i,
    build: (m, src) => [mkMod('CritMultiplier', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% increased (?:Critical Damage Bonus|Critical Strike Multiplier)(?: for Spells)?$/i,
    build: (m, src) => [mkMod('CritMultiplier', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^Deal no Elemental Damage$/i,
    build: (_, src) => [mkMod('DealNoElemental', 'FLAG', true, src)],
  },
  {
    pattern: /^Deal no Chaos Damage$/i,
    build: (_, src) => [mkMod('DealNoChaos', 'FLAG', true, src)],
  },
  // Penetration
  {
    pattern: /^Damage Penetrates (\d+)% (Fire|Cold|Lightning|Elemental) Resistance$/i,
    build: (m, src) => {
      const v = Number(m[1]);
      if (m[2] === 'Elemental') {
        return [
          mkMod('FirePenetration', 'BASE', v, src),
          mkMod('ColdPenetration', 'BASE', v, src),
          mkMod('LightningPenetration', 'BASE', v, src),
        ];
      }
      return [mkMod(`${m[2]}Penetration`, 'BASE', v, src)];
    },
  },
  // Iconic Keystones
  {
    pattern: /^Your Hits can't be Evaded$/i,
    build: (_, src) => [mkMod('HitsCantBeEvaded', 'FLAG', true, src, ModFlag.None, KeywordFlag.Hit)],
  },
  {
    pattern: /^Never deal Critical Strikes$/i,
    build: (_, src) => [mkMod('NeverCrit', 'FLAG', true, src)],
  },
  {
    pattern: /^Maximum Life becomes 1, Immune to Chaos Damage$/i,
    build: (_, src) => [
      mkMod('Life', 'OVERRIDE', 1, src),
      mkMod('ChaosImmune', 'FLAG', true, src),
    ],
  },
  {
    pattern: /^(\d+)% of Damage is taken from Mana before Life$/i,
    build: (m, src) => [mkMod('DamageTakenFromManaBeforeLife', 'BASE', Number(m[1]), src)],
  },
  // Flask / Buff keywords
  {
    pattern: /^Onslaught$/i,
    build: (_, src) => [
      mkMod('Speed', 'INC', 20, src, ModFlag.Attack),
      mkMod('Speed', 'INC', 20, src, ModFlag.Spell),
      mkMod('MovementSpeed', 'INC', 20, src),
    ],
  },
  // Ailments & Damage over Time (Ignite / Bleed / Poison)
  {
    pattern: /^\+(\d+)% to (Fire|Cold|Chaos|Physical) Damage over Time Multiplier$/i,
    build: (m, src) => [mkMod(`${m[2]}DotMultiplier`, 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^\+(\d+)% to Damage over Time Multiplier$/i,
    build: (m, src) => [mkMod('DotMultiplier', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% (increased|more|less) (?:Burning|Ignite) Damage$/i,
    build: (m, src) => {
      const val = m[2]!.toLowerCase() === 'less' ? -Number(m[1]) : Number(m[1]);
      return [mkMod('IgniteDamage', m[2]!.toLowerCase() === 'increased' ? 'INC' : 'MORE', val, src)];
    },
  },
  {
    pattern: /^(\d+)% (increased|more|less) Damage with (?:Ignite|Ignites|Ailments)$/i,
    build: (m, src) => {
      const val = m[2]!.toLowerCase() === 'less' ? -Number(m[1]) : Number(m[1]);
      return [mkMod('IgniteDamage', m[2]!.toLowerCase() === 'increased' ? 'INC' : 'MORE', val, src)];
    },
  },
  {
    pattern: /^(\d+)% (increased|more|less) (?:Damage over Time|Poison Damage|Bleeding Damage)$/i,
    build: (m, src) => {
      const val = m[2]!.toLowerCase() === 'less' ? -Number(m[1]) : Number(m[1]);
      return [mkMod('DotDamage', m[2]!.toLowerCase() === 'increased' ? 'INC' : 'MORE', val, src)];
    },
  },
  {
    pattern: /^(\d+)% chance to Ignite$/i,
    build: (m, src) => [mkMod('IgniteChance', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% chance to cause Bleeding$/i,
    build: (m, src) => [mkMod('BleedChance', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% chance to Poison on Hit$/i,
    build: (m, src) => [mkMod('PoisonChance', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^Hits always Ignite$/i,
    build: (_, src) => [mkMod('IgniteChance', 'BASE', 100, src)],
  },
  {
    pattern: /^(\d+)% increased Armour during effect$/i,
    build: (m, src) => [mkMod('Armour', 'INC', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% increased Evasion Rating during effect$/i,
    build: (m, src) => [mkMod('Evasion', 'INC', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% increased Critical Strike Chance during effect$/i,
    build: (m, src) => [mkMod('CritChance', 'INC', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% increased Movement Speed during effect$/i,
    build: (m, src) => [mkMod('MovementSpeed', 'INC', Number(m[1]), src)],
  },
  // Curses & Marks (Enemy debuffs)
  {
    pattern: /^Cursed enemies have ([+-]?\d+)% to (Fire|Cold|Lightning|Chaos) Resistance$/i,
    build: (m, src) => [mkMod(`Enemy${m[2]}Resist`, 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^Cursed enemies have ([+-]?\d+)% to Elemental Resistances$/i,
    build: (m, src) => {
      const v = Number(m[1]);
      return [
        mkMod('EnemyFireResist', 'BASE', v, src),
        mkMod('EnemyColdResist', 'BASE', v, src),
        mkMod('EnemyLightningResist', 'BASE', v, src),
      ];
    },
  },
  {
    pattern: /^Cursed enemies take (\d+)% increased Physical Damage$/i,
    build: (m, src) => [mkMod('EnemyPhysicalDamageTaken', 'INC', Number(m[1]), src)],
  },
  {
    pattern: /^Cursed enemies take (\d+)% increased Projectile Damage$/i,
    build: (m, src) => [mkMod('EnemyDamageTaken', 'INC', Number(m[1]), src, ModFlag.Projectile)],
  },
  {
    pattern: /^Hits against Cursed Enemies have \+(\d+(?:\.\d+)?)% to Critical Strike Chance$/i,
    build: (m, src) => [mkMod('EnemyCritChance', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^Hits against Cursed Enemies have \+(\d+)% to Critical Strike Multiplier$/i,
    build: (m, src) => [mkMod('EnemyCritMultiplier', 'BASE', Number(m[1]), src)],
  },
  // Mana Reservation Efficiency
  {
    pattern: /^(\d+)% increased Mana Reservation Efficiency(?: of Skills)?$/i,
    build: (m, src) => [mkMod('ManaReservationEfficiency', 'INC', Number(m[1]), src)],
  },
  // Endgame Keystones & Unique Conversions
  {
    pattern: /^Converts all Evasion Rating to Armour/i,
    build: (_, src) => [mkMod('IronReflexes', 'FLAG', true, src)],
  },
  {
    pattern: /^50% of Physical, Cold and Lightning Damage Converted to Fire Damage$/i,
    build: (_, src) => [
      mkMod('PhysicalDamageConvertToFire', 'BASE', 50, src),
      mkMod('ColdDamageConvertToFire', 'BASE', 50, src),
      mkMod('LightningDamageConvertToFire', 'BASE', 50, src),
    ],
  },
  {
    pattern: /^Deal no Non-Fire Damage$/i,
    build: (_, src) => [mkMod('DealNoNonFire', 'FLAG', true, src)],
  },
  {
    pattern: /^Your Critical Strikes do not deal extra Damage$/i,
    build: (_, src) => [mkMod('NoCritExtraDamage', 'FLAG', true, src)],
  },
  {
    pattern: /^Skills that have dealt a Critical Strike in the past 8 seconds deal (\d+)% more Elemental Damage/i,
    build: (m, src) => [mkMod('ElementalDamage', 'MORE', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% of Maximum Life Converted to Energy Shield$/i,
    build: (m, src) => [mkMod('LifeConvertToES', 'BASE', Number(m[1]), src)],
  },
  {
    pattern: /^(\d+)% increased Damage with (Bow|Wand|Sword|Axe|Mace|Claw|Dagger|Staff)s?$/i,
    build: (m, src) => [mkMod('Damage', 'INC', Number(m[1]), src, ModFlag.Attack)],
  },
];

/**
 * Parses a single stat line (English OR Chinese) into typed `Mod` entries.
 */
export function parseModLine(rawLine: string, source: string): Mod[] {
  const canonical = normalizeStatLineToEn(rawLine);
  if (!canonical) return [];

  for (const rule of PARSER_RULES) {
    const match = canonical.match(rule.pattern);
    if (match) {
      return rule.build(match, source);
    }
  }
  return [];
}

export function parseModLines(lines: readonly string[], source: string): Mod[] {
  const result: Mod[] = [];
  for (const rawEntry of lines) {
    // Official PoB passive tree nodes often pack multiple stat lines separated by `\n` (e.g. Resolute Technique)
    for (const line of rawEntry.split(/\r?\n/)) {
      if (line.trim()) {
        result.push(...parseModLine(line, source));
      }
    }
  }
  return result;
}
