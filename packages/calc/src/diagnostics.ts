import type { Build, CalcOutput, LocalizedText } from '@webpob/core';
import { getTreeForGame } from '@webpob/data';

export type DiagnosticSeverity = 'critical' | 'warning' | 'tip';

export interface BuildDiagnostic {
  id: string;
  severity: DiagnosticSeverity;
  title: LocalizedText;
  detail: LocalizedText;
  actionTab?: 'tree' | 'skills' | 'items' | 'config';
  quickAction?: 'activate_flasks';
}

/**
 * Inspects a live build + calculation output and surfaces actionable PoE 1 & PoE 2
 * optimization diagnostics (uncapped resists, low hit chance, over-reserved mana/spirit,
 * empty jewel sockets, inactive flasks, missing ascendancy, low EHP pool).
 */
export function analyzeBuildDiagnostics(build: Build, calc: CalcOutput): BuildDiagnostic[] {
  const list: BuildDiagnostic[] = [];
  const { offence, defence } = calc;

  // 1. Over-reserved Mana / Spirit
  const hasOverReservedMana = calc.warnings.some((w) => w.code === 'OVER_RESERVED_MANA');
  const reservedManaPct =
    defence.mana > 0 ? Math.round(((defence.mana - defence.manaUnreserved) / defence.mana) * 100) : 0;
  if (hasOverReservedMana || defence.manaUnreserved < 0) {
    list.push({
      id: 'over_reserved_mana',
      severity: 'critical',
      title: { en: 'Mana Over-Reserved', zh: '魔力保留已超限' },
      detail: {
        en: `Mana reservation exceeds 100% (unreserved ${defence.manaUnreserved}). Link Enlighten Support or add Mana Reservation Efficiency.`,
        zh: `当前魔力保留已超限（剩余 ${defence.manaUnreserved}），建议给光环连接「启蒙辅助」或补充魔力保留效率。`,
      },
      actionTab: 'skills',
    });
  } else if (offence.manaCost > 0 && defence.manaUnreserved < offence.manaCost) {
    list.push({
      id: 'insufficient_unreserved_mana',
      severity: 'warning',
      title: { en: 'Unreserved Mana Below Skill Cost', zh: '剩余魔力不足以施放主技能' },
      detail: {
        en: `Unreserved Mana (${defence.manaUnreserved}, ${reservedManaPct}% reserved) is below main skill cost (${offence.manaCost}).`,
        zh: `未保留魔力（${defence.manaUnreserved}，已保留 ${reservedManaPct}%）低于主技能单次消耗（${offence.manaCost}），实战可能无法施放。`,
      },
      actionTab: 'skills',
    });
  }

  if (build.game === 'poe2' && defence.spiritUnreserved < 0) {
    list.push({
      id: 'over_reserved_spirit',
      severity: 'critical',
      title: { en: 'Spirit Over-Reserved', zh: '精魂保留已超过上限' },
      detail: {
        en: `Reserved ${defence.spiritReserved} Spirit out of ${defence.spirit} available. Add +Spirit on Amulet/Body Armour or disable a persistent buff.`,
        zh: `已保留精魂 ${defence.spiritReserved} 超出上限 ${defence.spirit}，需在项链/胸甲补充精魂或关闭部分持续光环。`,
      },
      actionTab: 'items',
    });
  }

  // 2. Uncapped Elemental Resistances
  const missingEle: string[] = [];
  const missingEleZh: string[] = [];
  if (defence.fireResist < defence.fireMaxResist) {
    const gap = defence.fireMaxResist - defence.fireResist;
    missingEle.push(`Fire -${gap}%`);
    missingEleZh.push(`火抗缺 ${gap}%`);
  }
  if (defence.coldResist < defence.coldMaxResist) {
    const gap = defence.coldMaxResist - defence.coldResist;
    missingEle.push(`Cold -${gap}%`);
    missingEleZh.push(`冰抗缺 ${gap}%`);
  }
  if (defence.lightningResist < defence.lightningMaxResist) {
    const gap = defence.lightningMaxResist - defence.lightningResist;
    missingEle.push(`Light -${gap}%`);
    missingEleZh.push(`雷抗缺 ${gap}%`);
  }
  if (missingEle.length > 0) {
    const severe =
      defence.fireResist < 60 || defence.coldResist < 60 || defence.lightningResist < 60;
    list.push({
      id: 'uncapped_ele_res',
      severity: severe ? 'critical' : 'warning',
      title: { en: 'Elemental Resistances Uncapped', zh: '元素抗性未满上限' },
      detail: {
        en: `Missing ${missingEle.join(', ')}. Craft resistances on rings/belt/boots or select Bandit Alira (+15% all res).`,
        zh: `${missingEleZh.join('、')}。建议通过戒指/腰带制作台补抗，或盗贼选择阿莉亚（+15%全抗）。`,
      },
      actionTab: 'items',
    });
  }

  // 3. Low Chaos Resistance (non-CI)
  if (defence.life > 1 && defence.chaosResist < 0 && build.level >= 70) {
    list.push({
      id: 'negative_chaos_res',
      severity: 'tip',
      title: { en: `Negative Chaos Resistance (${defence.chaosResist}%)`, zh: `混沌抗性为负（${defence.chaosResist}%）` },
      detail: {
        en: 'Endgame Chaos hits deal amplified damage below 0%. Amethyst Ring or Chaos Res mods greatly raise EHP.',
        zh: '终局异界混沌伤害威胁较高，建议通过紫晶戒指或装备词缀将混沌抗性提升至 0% 以上。',
      },
      actionTab: 'items',
    });
  }

  // 4. Low Attack Hit Chance (< 99%)
  if (offence.skillType === 'Attack' && offence.hitChance < 99) {
    list.push({
      id: 'low_hit_chance',
      severity: offence.hitChance < 90 ? 'critical' : 'warning',
      title: {
        en: `Attack Hit Chance is ${offence.hitChance.toFixed(0)}%`,
        zh: `攻击命中率偏低（${offence.hitChance.toFixed(0)}%）`,
      },
      detail: {
        en: 'Missed attacks lose both direct DPS and crit confirmation. Add Precision aura, flat Accuracy, or Resolute Technique.',
        zh: '未命中会直接损失输出并降低暴击二次检定收益，建议补充精准光环、命中词缀或点出必中。',
      },
      actionTab: 'skills',
    });
  }

  // 5. Equipped Utility Flasks toggled Off (PoE 1)
  if (build.game === 'poe1') {
    const inactiveFlasks = (['Flask 1', 'Flask 2', 'Flask 3', 'Flask 4', 'Flask 5'] as const).filter(
      (slot) => Boolean(build.equipped[slot]) && !build.activeFlaskSlots?.[slot],
    );
    if (inactiveFlasks.length > 0) {
      list.push({
        id: 'inactive_flasks',
        severity: 'tip',
        title: {
          en: `${inactiveFlasks.length} Equipped Flask(s) Toggled Off`,
          zh: `${inactiveFlasks.length} 瓶已装备药剂未启用`,
        },
        detail: {
          en: 'Enable equipped flasks to include their DPS and defence buffs in calculations.',
          zh: '开启已装备的功能药剂以在攻防面板中计入实战增益。',
        },
        actionTab: 'items',
        quickAction: 'activate_flasks',
      });
    }
  }

  // 6. Allocated Empty Jewel Sockets on the Passive Tree
  const tree = getTreeForGame(build.game);
  const allAllocated = new Set<number>([
    ...build.tree.allocatedNodeIds,
    ...(build.game === 'poe2'
      ? build.activeWeaponSet === 2
        ? build.tree.weaponSet2NodeIds
        : build.tree.weaponSet1NodeIds
      : []),
  ]);
  let emptyJewelSockets = 0;
  for (const nodeId of allAllocated) {
    const node = tree.nodes[nodeId];
    if (node?.kind === 'jewel' && !build.tree.socketedJewels?.[nodeId]) {
      emptyJewelSockets++;
    }
  }
  if (emptyJewelSockets > 0) {
    list.push({
      id: 'empty_jewel_sockets',
      severity: 'tip',
      title: {
        en: `${emptyJewelSockets} Empty Allocated Jewel Socket(s)`,
        zh: `天赋树有 ${emptyJewelSockets} 个已点亮的空珠宝槽`,
      },
      detail: {
        en: 'Click allocated hexagonal Jewel Sockets on the Passive Tree to socket Jewels, Cluster Jewels, or Timeless Keystones.',
        zh: '在天赋树中点击已点亮的六边形珠宝孔，即可镶嵌常规珠宝、星团珠宝或永恒珠宝。',
      },
      actionTab: 'tree',
    });
  }

  // 7. Low Combined Life + ES Pool at Endgame
  const totalPool = defence.life + defence.energyShield + (defence.ward ?? 0);
  const targetPool = build.level >= 80 ? 3200 : build.level >= 65 ? 2200 : 0;
  if (targetPool > 0 && totalPool < targetPool) {
    list.push({
      id: 'low_hit_pool',
      severity: 'warning',
      title: {
        en: `Low Life + ES Pool (${totalPool.toLocaleString()})`,
        zh: `总生命+护盾池偏低（${totalPool.toLocaleString()}）`,
      },
      detail: {
        en: `For Lv.${build.level}, aim for at least ${targetPool.toLocaleString()}+ combined Life/ES to avoid endgame one-shots.`,
        zh: `${build.level} 级终局建议总生命+护盾达到 ${targetPool.toLocaleString()}+，可通过热力图查看高 EHP 天赋大点。`,
      },
      actionTab: 'tree',
    });
  }

  // 8. Missing Ascendancy at Lv.40+
  if (build.level >= 40 && (!build.ascendancyId || build.ascendancyId === 'None')) {
    list.push({
      id: 'missing_ascendancy',
      severity: 'warning',
      title: { en: 'No Ascendancy Selected', zh: '尚未选择升华职业' },
      detail: {
        en: 'Select an Ascendancy in the top bar and allocate Ascendancy notables on the Passive Tree.',
        zh: '请在顶部栏选择升华职业，并在天赋树中点击「升华」分配升华天赋点。',
      },
      actionTab: 'tree',
    });
  }

  return list;
}
