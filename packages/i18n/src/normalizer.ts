import type { Locale } from '@webpob/core';

interface StatRewriteRule {
  zhPattern: RegExp;
  toEn: (...args: string[]) => string;
}

interface EnToZhRule {
  enPattern: RegExp;
  toZh: (...args: string[]) => string;
}

const ZH_DAMAGE_TYPE_TO_EN: Record<string, string> = {
  物理: 'Physical',
  火焰: 'Fire',
  冰霜: 'Cold',
  冰冷: 'Cold',
  闪电: 'Lightning',
  混沌: 'Chaos',
  元素: 'Elemental',
};

const EN_DAMAGE_TYPE_TO_ZH: Record<string, string> = {
  Physical: '物理',
  Fire: '火焰',
  Cold: '冰霜',
  Lightning: '闪电',
  Chaos: '混沌',
  Elemental: '元素',
};

const ZH_ATTR_TO_EN: Record<string, string> = {
  力量: 'Strength',
  敏捷: 'Dexterity',
  智慧: 'Intelligence',
  全属性: 'all Attributes',
  所有属性: 'all Attributes',
};

const EN_ATTR_TO_ZH: Record<string, string> = {
  Strength: '力量',
  Dexterity: '敏捷',
  Intelligence: '智慧',
  'all Attributes': '全属性',
};

const ZH_TO_EN_RULES: StatRewriteRule[] = [
  // Flat Life / Mana / ES / Spirit
  {
    zhPattern: /^(?:最大生命\s*\+?(\d+)|\+(\d+)\s*最大生命)$/,
    toEn: (_, a, b) => `+${a || b} to maximum Life`,
  },
  {
    zhPattern: /^(?:最大魔力\s*\+?(\d+)|\+(\d+)\s*最大魔力)$/,
    toEn: (_, a, b) => `+${a || b} to maximum Mana`,
  },
  {
    zhPattern: /^(?:最大能量护盾\s*\+?(\d+)|\+(\d+)\s*最大能量护盾)$/,
    toEn: (_, a, b) => `+${a || b} to maximum Energy Shield`,
  },
  {
    zhPattern: /^(?:最大精魂\s*\+?(\d+)|\+(\d+)\s*(?:最大)?精魂|精魂\s*\+?(\d+))$/,
    toEn: (_, a, b, c) => `+${a || b || c} to Spirit`,
  },
  // Increased % Life / ES / Mana / Armour / Evasion
  {
    zhPattern: /^最大生命(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased maximum Life`,
  },
  {
    zhPattern: /^最大能量护盾(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased maximum Energy Shield`,
  },
  {
    zhPattern: /^能量护盾(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased Energy Shield`,
  },
  {
    zhPattern: /^最大魔力(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased maximum Mana`,
  },
  {
    zhPattern: /^护甲(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased Armour`,
  },
  {
    zhPattern: /^闪避值?(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased Evasion Rating`,
  },
  {
    zhPattern: /^\+(\d+)\s*护甲$/,
    toEn: (_, v) => `+${v} to Armour`,
  },
  {
    zhPattern: /^\+(\d+)\s*闪避值?$/,
    toEn: (_, v) => `+${v} to Evasion Rating`,
  },
  // Attributes
  {
    zhPattern: /^\+(\d+)\s*(力量|敏捷|智慧|全属性|所有属性)$/,
    toEn: (_, v, attr) => `+${v} to ${ZH_ATTR_TO_EN[attr] ?? attr}`,
  },
  {
    zhPattern: /^(力量|敏捷|智慧|全属性|所有属性)\s*\+(\d+)$/,
    toEn: (_, attr, v) => `+${v} to ${ZH_ATTR_TO_EN[attr] ?? attr}`,
  },
  // Resistances
  {
    zhPattern: /^(?:全元素抗性|所有元素抗性)\s*([+-]?\d+)%$/,
    toEn: (_, v) => `${v.startsWith('-') ? v : `+${v.replace(/^\+/, '')}`}% to all Elemental Resistances`,
  },
  {
    zhPattern: /^([+-]?\d+)%\s*(?:全元素抗性|所有元素抗性)$/,
    toEn: (_, v) => `${v.startsWith('-') ? v : `+${v.replace(/^\+/, '')}`}% to all Elemental Resistances`,
  },
  {
    zhPattern: /^(火焰|冰霜|冰冷|闪电|混沌)抗性上限\s*\+?(\d+)%$/,
    toEn: (_, el, v) => `+${v}% to maximum ${ZH_DAMAGE_TYPE_TO_EN[el] ?? el} Resistance`,
  },
  {
    zhPattern: /^\+(\d+)%\s*最大(火焰|冰霜|冰冷|闪电|混沌)抗性$/,
    toEn: (_, v, el) => `+${v}% to maximum ${ZH_DAMAGE_TYPE_TO_EN[el] ?? el} Resistance`,
  },
  {
    zhPattern: /^(火焰|冰霜|冰冷|闪电|混沌)抗性\s*([+-]?\d+)%$/,
    toEn: (_, el, v) => `${v.startsWith('-') ? v : `+${v.replace(/^\+/, '')}`}% to ${ZH_DAMAGE_TYPE_TO_EN[el] ?? el} Resistance`,
  },
  {
    zhPattern: /^([+-]?\d+)%\s*(火焰|冰霜|冰冷|闪电|混沌)抗性$/,
    toEn: (_, v, el) => `${v.startsWith('-') ? v : `+${v.replace(/^\+/, '')}`}% to ${ZH_DAMAGE_TYPE_TO_EN[el] ?? el} Resistance`,
  },
  // Added flat damage
  {
    zhPattern: /^附加\s*(\d+)\s*(?:-|到|至)\s*(\d+)\s*点?(?:基础)?(物理|火焰|冰霜|冰冷|闪电|混沌)伤害$/,
    toEn: (_, min, max, el) => `Adds ${min} to ${max} ${ZH_DAMAGE_TYPE_TO_EN[el] ?? el} Damage`,
  },
  {
    zhPattern: /^法术附加\s*(\d+)\s*(?:-|到|至)\s*(\d+)\s*点?(?:基础)?(物理|火焰|冰霜|冰冷|闪电|混沌)伤害$/,
    toEn: (_, min, max, el) => `Adds ${min} to ${max} ${ZH_DAMAGE_TYPE_TO_EN[el] ?? el} Damage to Spells`,
  },
  {
    zhPattern: /^攻击附加\s*(\d+)\s*(?:-|到|至)\s*(\d+)\s*点?(?:基础)?(物理|火焰|冰霜|冰冷|闪电|混沌)伤害$/,
    toEn: (_, min, max, el) => `Adds ${min} to ${max} ${ZH_DAMAGE_TYPE_TO_EN[el] ?? el} Damage to Attacks`,
  },
  // Increased / More Damage
  {
    zhPattern: /^(物理|火焰|冰霜|冰冷|闪电|混沌|元素)伤害(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, el, v) => `${v}% increased ${ZH_DAMAGE_TYPE_TO_EN[el] ?? el} Damage`,
  },
  {
    zhPattern: /^攻击(物理|火焰|冰霜|冰冷|闪电|混沌|元素)伤害(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, el, v) => `${v}% increased ${ZH_DAMAGE_TYPE_TO_EN[el] ?? el} Damage with Attack Skills`,
  },
  {
    zhPattern: /^法术伤害(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased Spell Damage`,
  },
  {
    zhPattern: /^攻击伤害(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased Attack Damage`,
  },
  {
    zhPattern: /^投射物伤害(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased Projectile Damage`,
  },
  {
    zhPattern: /^近战伤害(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased Melee Damage`,
  },
  {
    zhPattern: /^范围伤害(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased Area Damage`,
  },
  {
    zhPattern: /^伤害(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased Damage`,
  },
  {
    zhPattern: /^(物理|火焰|冰霜|冰冷|闪电|混沌|元素)伤害总增\s*(\d+)%$/,
    toEn: (_, el, v) => `${v}% more ${ZH_DAMAGE_TYPE_TO_EN[el] ?? el} Damage`,
  },
  {
    zhPattern: /^法术伤害总增\s*(\d+)%$/,
    toEn: (_, v) => `${v}% more Spell Damage`,
  },
  {
    zhPattern: /^攻击伤害总增\s*(\d+)%$/,
    toEn: (_, v) => `${v}% more Attack Damage`,
  },
  {
    zhPattern: /^伤害总增\s*(\d+)%$/,
    toEn: (_, v) => `${v}% more Damage`,
  },
  // Speed
  {
    zhPattern: /^攻击和施法速度(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased Attack and Cast Speed`,
  },
  {
    zhPattern: /^攻击速度(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased Attack Speed`,
  },
  {
    zhPattern: /^施法速度(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased Cast Speed`,
  },
  {
    zhPattern: /^移动速度(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased Movement Speed`,
  },
  // Crit
  {
    zhPattern: /^法术暴击率(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased Critical Strike Chance for Spells`,
  },
  {
    zhPattern: /^(?:攻击)?暴击率(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased Critical Strike Chance`,
  },
  {
    zhPattern: /^(?:全局)?暴击伤害加成\s*\+?(\d+)%$/,
    toEn: (_, v) => `+${v}% to Global Critical Strike Multiplier`,
  },
  {
    zhPattern: /^\+(\d+)%\s*(?:全局)?暴击伤害加成$/,
    toEn: (_, v) => `+${v}% to Global Critical Strike Multiplier`,
  },
  // Accuracy, Block, Spell Suppression, Regen, Penetration
  {
    zhPattern: /^(?:命中值\s*\+?(\d+)|\+(\d+)\s*命中值)$/,
    toEn: (_, a, b) => `+${a || b} to Accuracy Rating`,
  },
  {
    zhPattern: /^法术伤害压制率\s*\+?(\d+)%$/,
    toEn: (_, v) => `+${v}% chance to Suppress Spell Damage`,
  },
  {
    zhPattern: /^\+(\d+)%\s*攻击格挡率$/,
    toEn: (_, v) => `+${v}% Chance to Block Attack Damage`,
  },
  {
    zhPattern: /^每秒再生\s*(\d+(?:\.\d+)?)\s*(?:点)?生命$/,
    toEn: (_, v) => `Regenerate ${v} Life per second`,
  },
  {
    zhPattern: /^每秒再生\s*(\d+(?:\.\d+)?)%\s*生命$/,
    toEn: (_, v) => `Regenerate ${v}% of Life per second`,
  },
  {
    zhPattern: /^伤害穿透\s*(\d+)%\s*(火焰|冰霜|冰冷|闪电|混沌|元素)抗性$/,
    toEn: (_, v, el) => `Damage Penetrates ${v}% ${ZH_DAMAGE_TYPE_TO_EN[el] ?? el} Resistance`,
  },
  {
    zhPattern: /^武器攻击的基础暴击率为\s*(\d+(?:\.\d+)?)%$/,
    toEn: (_, v) => `Base Critical Strike Chance for Attacks with Weapons is ${v}%`,
  },
  {
    zhPattern: /^每点怒火(?:同时)?提供\s*(\d+)%\s*攻击速度(?:提高|增加)$/,
    toEn: (_, v) => `Every Rage also grants ${v}% increased Attack Speed`,
  },
  {
    zhPattern: /^力量的伤害加成也作用于所有法术伤害$/,
    toEn: () => `Strength's Damage bonus applies to all Spell Damage as well`,
  },
  {
    zhPattern: /^受到的伤害(?:提高|增加)\s*(\d+)%$/,
    toEn: (_, v) => `${v}% increased Damage taken`,
  },
  // Skill Gem Level & Quality bonuses (PoE 1 & PoE 2 Chinese clipboard / custom mods)
  {
    zhPattern: /^所有技能宝石等级\s*\+(\d+)$/,
    toEn: (_, v) => `+${v} to Level of all Skill Gems`,
  },
  {
    zhPattern: /^所有技能等级\s*\+(\d+)$/,
    toEn: (_, v) => `+${v} to Level of all Skills`,
  },
  {
    zhPattern: /^所有(火焰|冰霜|冰冷|闪电|物理|混沌|元素)法术技能(?:宝石)?等级\s*\+(\d+)$/,
    toEn: (_, el, v) => `+${v} to Level of all ${ZH_DAMAGE_TYPE_TO_EN[el] ?? el} Spell Skill Gems`,
  },
  {
    zhPattern: /^所有(法术|攻击|近战|投射物|弓|召唤生物|光环|诅咒|火焰|冰霜|冰冷|闪电|物理|混沌|元素)技能(?:宝石)?等级\s*\+(\d+)$/,
    toEn: (_, tag, v) => {
      const map: Record<string, string> = {
        法术: 'Spell',
        攻击: 'Attack',
        近战: 'Melee',
        投射物: 'Projectile',
        弓: 'Bow',
        召唤生物: 'Minion',
        光环: 'Aura',
        诅咒: 'Curse',
        ...ZH_DAMAGE_TYPE_TO_EN,
      };
      return `+${v} to Level of all ${map[tag] ?? tag} Skill Gems`;
    },
  },
  {
    zhPattern: /^所有技能宝石品质\s*\+(\d+)%$/,
    toEn: (_, v) => `+${v}% to Quality of all Skill Gems`,
  },
  {
    zhPattern: /^所有元素抗性上限\s*\+(\d+)%$/,
    toEn: (_, v) => `+${v}% to all maximum Elemental Resistances`,
  },
  {
    zhPattern: /^此物品上插槽中(?:(?:火焰|冰霜|冰冷|闪电|物理|混沌|元素|召唤生物|法术|攻击|光环|辅助|力量|敏捷|智慧)?)?(?:技能)?宝石等级\s*\+(\d+)$/,
    toEn: (full, v) => {
      const m = full.match(/插槽中(火焰|冰霜|冰冷|闪电|物理|混沌|元素|召唤生物|法术|攻击|光环|辅助|力量|敏捷|智慧)/);
      const map: Record<string, string> = {
        召唤生物: 'Minion',
        法术: 'Spell',
        攻击: 'Attack',
        光环: 'Aura',
        辅助: 'Support',
        力量: 'Strength',
        敏捷: 'Dexterity',
        智慧: 'Intelligence',
        ...ZH_DAMAGE_TYPE_TO_EN,
      };
      const tag = m?.[1] ? `${map[m[1]] ?? m[1]} ` : '';
      return `+${v} to Level of Socketed ${tag}Gems`;
    },
  },
];

const EN_TO_ZH_RULES: EnToZhRule[] = [
  { enPattern: /^\+(\d+) to maximum Life$/i, toZh: (_, v) => `最大生命 +${v}` },
  { enPattern: /^\+(\d+) to maximum Mana$/i, toZh: (_, v) => `最大魔力 +${v}` },
  { enPattern: /^\+(\d+) to maximum Energy Shield$/i, toZh: (_, v) => `最大能量护盾 +${v}` },
  { enPattern: /^\+(\d+) to Spirit$/i, toZh: (_, v) => `最大精魂 +${v}` },
  { enPattern: /^(\d+)% increased maximum Life$/i, toZh: (_, v) => `最大生命提高 ${v}%` },
  { enPattern: /^(\d+)% increased maximum Energy Shield$/i, toZh: (_, v) => `最大能量护盾提高 ${v}%` },
  { enPattern: /^(\d+)% increased Energy Shield$/i, toZh: (_, v) => `能量护盾提高 ${v}%` },
  { enPattern: /^(\d+)% increased maximum Mana$/i, toZh: (_, v) => `最大魔力提高 ${v}%` },
  { enPattern: /^(\d+)% increased Armour$/i, toZh: (_, v) => `护甲提高 ${v}%` },
  { enPattern: /^(\d+)% increased Evasion Rating$/i, toZh: (_, v) => `闪避值提高 ${v}%` },
  { enPattern: /^\+(\d+) to Armour$/i, toZh: (_, v) => `护甲 +${v}` },
  { enPattern: /^\+(\d+) to Evasion Rating$/i, toZh: (_, v) => `闪避值 +${v}` },
  {
    enPattern: /^\+(\d+) to (Strength|Dexterity|Intelligence|all Attributes)$/i,
    toZh: (_, v, attr) => `${EN_ATTR_TO_ZH[attr] ?? attr} +${v}`,
  },
  {
    enPattern: /^([+-]?\d+)% to all Elemental Resistances$/i,
    toZh: (_, v) => `全元素抗性 ${v}%`,
  },
  {
    enPattern: /^\+(\d+)% to maximum (Fire|Cold|Lightning|Chaos) Resistance$/i,
    toZh: (_, v, el) => `${EN_DAMAGE_TYPE_TO_ZH[el] ?? el}抗性上限 +${v}%`,
  },
  {
    enPattern: /^([+-]?\d+)% to (Fire|Cold|Lightning|Chaos) Resistance$/i,
    toZh: (_, v, el) => `${EN_DAMAGE_TYPE_TO_ZH[el] ?? el}抗性 ${v}%`,
  },
  {
    enPattern: /^Adds (\d+) to (\d+) (Physical|Fire|Cold|Lightning|Chaos) Damage to Spells$/i,
    toZh: (_, min, max, el) => `法术附加 ${min} - ${max} 点${EN_DAMAGE_TYPE_TO_ZH[el] ?? el}伤害`,
  },
  {
    enPattern: /^Adds (\d+) to (\d+) (Physical|Fire|Cold|Lightning|Chaos) Damage to Attacks$/i,
    toZh: (_, min, max, el) => `攻击附加 ${min} - ${max} 点${EN_DAMAGE_TYPE_TO_ZH[el] ?? el}伤害`,
  },
  {
    enPattern: /^Adds (\d+) to (\d+) (Physical|Fire|Cold|Lightning|Chaos) Damage$/i,
    toZh: (_, min, max, el) => `附加 ${min} - ${max} 点${EN_DAMAGE_TYPE_TO_ZH[el] ?? el}伤害`,
  },
  {
    enPattern: /^(\d+)% increased (Physical|Fire|Cold|Lightning|Chaos|Elemental) Damage with Attack Skills$/i,
    toZh: (_, v, el) => `攻击${EN_DAMAGE_TYPE_TO_ZH[el] ?? el}伤害提高 ${v}%`,
  },
  {
    enPattern: /^(\d+)% increased (Physical|Fire|Cold|Lightning|Chaos|Elemental) Damage$/i,
    toZh: (_, v, el) => `${EN_DAMAGE_TYPE_TO_ZH[el] ?? el}伤害提高 ${v}%`,
  },
  {
    enPattern: /^(\d+)% more (Physical|Fire|Cold|Lightning|Chaos|Elemental) Damage$/i,
    toZh: (_, v, el) => `${EN_DAMAGE_TYPE_TO_ZH[el] ?? el}伤害总增 ${v}%`,
  },
  { enPattern: /^(\d+)% increased Spell Damage$/i, toZh: (_, v) => `法术伤害提高 ${v}%` },
  { enPattern: /^(\d+)% more Spell Damage$/i, toZh: (_, v) => `法术伤害总增 ${v}%` },
  { enPattern: /^(\d+)% increased Attack Damage$/i, toZh: (_, v) => `攻击伤害提高 ${v}%` },
  { enPattern: /^(\d+)% more Attack Damage$/i, toZh: (_, v) => `攻击伤害总增 ${v}%` },
  { enPattern: /^(\d+)% increased Projectile Damage$/i, toZh: (_, v) => `投射物伤害提高 ${v}%` },
  { enPattern: /^(\d+)% more Projectile Damage$/i, toZh: (_, v) => `投射物伤害总增 ${v}%` },
  { enPattern: /^(\d+)% increased Melee Damage$/i, toZh: (_, v) => `近战伤害提高 ${v}%` },
  { enPattern: /^(\d+)% more Melee Damage$/i, toZh: (_, v) => `近战伤害总增 ${v}%` },
  { enPattern: /^(\d+)% increased Area Damage$/i, toZh: (_, v) => `范围伤害提高 ${v}%` },
  { enPattern: /^(\d+)% more Area Damage$/i, toZh: (_, v) => `范围伤害总增 ${v}%` },
  { enPattern: /^(\d+)% increased Damage$/i, toZh: (_, v) => `伤害提高 ${v}%` },
  { enPattern: /^(\d+)% more Damage$/i, toZh: (_, v) => `伤害总增 ${v}%` },
  { enPattern: /^(\d+)% less Damage$/i, toZh: (_, v) => `伤害总降 ${v}%` },
  { enPattern: /^(\d+)% increased Attack and Cast Speed$/i, toZh: (_, v) => `攻击和施法速度提高 ${v}%` },
  { enPattern: /^(\d+)% increased Attack Speed$/i, toZh: (_, v) => `攻击速度提高 ${v}%` },
  { enPattern: /^(\d+)% more Attack Speed$/i, toZh: (_, v) => `攻击速度总增 ${v}%` },
  { enPattern: /^(\d+)% increased Cast Speed$/i, toZh: (_, v) => `施法速度提高 ${v}%` },
  { enPattern: /^(\d+)% more Cast Speed$/i, toZh: (_, v) => `施法速度总增 ${v}%` },
  { enPattern: /^(\d+)% increased Movement Speed$/i, toZh: (_, v) => `移动速度提高 ${v}%` },
  { enPattern: /^(\d+)% increased Critical Strike Chance for Spells$/i, toZh: (_, v) => `法术暴击率提高 ${v}%` },
  { enPattern: /^(\d+)% increased Critical Strike Chance$/i, toZh: (_, v) => `暴击率提高 ${v}%` },
  { enPattern: /^\+(\d+)% to Global Critical Strike Multiplier$/i, toZh: (_, v) => `全局暴击伤害加成 +${v}%` },
  { enPattern: /^\+(\d+)% to Critical Strike Multiplier$/i, toZh: (_, v) => `暴击伤害加成 +${v}%` },
  { enPattern: /^\+(\d+) to Accuracy Rating$/i, toZh: (_, v) => `命中值 +${v}` },
  { enPattern: /^\+(\d+)% chance to Suppress Spell Damage$/i, toZh: (_, v) => `法术伤害压制率 +${v}%` },
  { enPattern: /^\+(\d+)% Chance to Block Attack Damage$/i, toZh: (_, v) => `攻击格挡率 +${v}%` },
  { enPattern: /^\+(\d+)% Chance to Block Spell Damage$/i, toZh: (_, v) => `法术格挡率 +${v}%` },
  { enPattern: /^Regenerate (\d+(?:\.\d+)?) Life per second$/i, toZh: (_, v) => `每秒再生 ${v} 生命` },
  { enPattern: /^Regenerate (\d+(?:\.\d+)?)% of Life per second$/i, toZh: (_, v) => `每秒再生 ${v}% 生命` },
  {
    enPattern: /^Damage Penetrates (\d+)% (Fire|Cold|Lightning|Chaos|Elemental) Resistance$/i,
    toZh: (_, v, el) => `伤害穿透 ${v}% ${EN_DAMAGE_TYPE_TO_ZH[el] ?? el}抗性`,
  },
  {
    enPattern: /^(\d+)% of Physical Damage Converted to (Fire|Cold|Lightning|Chaos) Damage$/i,
    toZh: (_, v, el) => `${v}% 物理伤害转化为${EN_DAMAGE_TYPE_TO_ZH[el] ?? el}伤害`,
  },
  {
    enPattern: /^Gain (\d+)% of Physical Damage as Extra (Fire|Cold|Lightning|Chaos) Damage$/i,
    toZh: (_, v, el) => `获得相当于物理伤害 ${v}% 的额外${EN_DAMAGE_TYPE_TO_ZH[el] ?? el}伤害`,
  },
  {
    enPattern: /^Gain (\d+)% of Elemental Damage as Extra Chaos Damage$/i,
    toZh: (_, v) => `获得相当于元素伤害 ${v}% 的额外混沌伤害`,
  },
  {
    enPattern: /^Your Hits can't be Evaded$/i,
    toZh: () => `你的击中无法被闪避`,
  },
  {
    enPattern: /^Never deal Critical Strikes$/i,
    toZh: () => `永远不会造成暴击`,
  },
  {
    enPattern: /^Maximum Life becomes 1, Immune to Chaos Damage$/i,
    toZh: () => `最大生命变为 1，免疫混沌伤害`,
  },
  {
    enPattern: /^30% of Damage is taken from Mana before Life$/i,
    toZh: () => `承受伤害的 30% 优先从魔力扣除`,
  },
  {
    enPattern: /^\+(\d+) to Level of all Skill Gems$/i,
    toZh: (_, v) => `所有技能宝石等级 +${v}`,
  },
  {
    enPattern: /^\+(\d+) to Level of all Skills$/i,
    toZh: (_, v) => `所有技能等级 +${v}`,
  },
  {
    enPattern: /^\+(\d+)% to Quality of all Skill Gems$/i,
    toZh: (_, v) => `所有技能宝石品质 +${v}%`,
  },
  {
    enPattern: /^\+(\d+) to Level of all (Fire|Cold|Lightning|Physical|Chaos|Elemental) Spell (?:Skill Gems|Skills)$/i,
    toZh: (_, v, el) => {
      const map: Record<string, string> = {
        Fire: '火焰',
        Cold: '冰霜',
        Lightning: '闪电',
        Physical: '物理',
        Chaos: '混沌',
        Elemental: '元素',
      };
      return `所有${map[el] ?? el}法术技能等级 +${v}`;
    },
  },
  {
    enPattern: /^\+(\d+) to Level of all (Spell|Attack|Melee|Projectile|Bow|Minion|Aura|Curse|Fire|Cold|Lightning|Physical|Chaos|Elemental) (?:Skill Gems|Skills)$/i,
    toZh: (_, v, tag) => {
      const map: Record<string, string> = {
        Spell: '法术',
        Attack: '攻击',
        Melee: '近战',
        Projectile: '投射物',
        Bow: '弓',
        Minion: '召唤生物',
        Aura: '光环',
        Curse: '诅咒',
        Fire: '火焰',
        Cold: '冰霜',
        Lightning: '闪电',
        Physical: '物理',
        Chaos: '混沌',
        Elemental: '元素',
      };
      return `所有${map[tag] ?? tag}技能等级 +${v}`;
    },
  },
  {
    enPattern: /^\+(\d+) to Level of Socketed Gems$/i,
    toZh: (_, v) => `此物品上插槽中宝石等级 +${v}`,
  },
  {
    enPattern: /^\+(\d+)% to all maximum Elemental Resistances$/i,
    toZh: (_, v) => `所有元素抗性上限 +${v}%`,
  },
];

/**
 * Normalizes a Chinese (or already English) modifier line into canonical English
 * so `@webpob/calc`'s ModParser produces identical results regardless of input language.
 */
export function normalizeStatLineToEn(rawLine: string): string {
  const cleaned = rawLine
    .trim()
    .replace(/^\{[^}]+\}\s*/g, '')
    .replace(/\{[^}]+\}/g, '')
    .replace(/（[^）]*）/g, '')
    .replace(/\((?:implicit|crafted|enchant|fractured)\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  // Fast path if purely ASCII
  if (/^[\x00-\x7F]+$/.test(cleaned)) {
    return cleaned;
  }

  for (const rule of ZH_TO_EN_RULES) {
    const match = cleaned.match(rule.zhPattern);
    if (match) {
      return rule.toEn(...match);
    }
  }

  return cleaned;
}

/**
 * Formats a canonical English stat line into the active UI locale.
 */
export function localizeStatLine(enLine: string, locale: Locale): string {
  if (locale === 'en') return enLine;
  const trimmed = enLine.trim();
  for (const rule of EN_TO_ZH_RULES) {
    const match = trimmed.match(rule.enPattern);
    if (match) {
      return rule.toZh(...match);
    }
  }
  return trimmed;
}
