import type { Build, CalcOutput, Locale } from '@webpob/core';
import { getClassesForGame } from '@webpob/data';
import { localizeText, uiText } from '@webpob/i18n';

function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function buildSummaryToMarkdown(
  build: Build,
  calc: CalcOutput,
  locale: Locale,
  shareUrl?: string,
): string {
  const classes = getClassesForGame(build.game);
  const cls = classes.find((c) => c.id === build.classId);
  const asc = cls?.ascendancies.find((a) => a.id === build.ascendancyId);
  const classLabel = cls ? localizeText(cls.name, locale) : build.classId;
  const ascLabel = asc ? localizeText(asc.name, locale) : build.ascendancyId || (uiText(locale, '无升华', 'None'));
  const gameTag = build.game === 'poe2' ? 'PoE 2 (0.5)' : 'PoE 1 (3.30)';
  const o = calc.offence;
  const d = calc.defence;

  const lines: string[] = [
    `### ${build.name} — ${gameTag}`,
    `**${classLabel} (${ascLabel}) Lv.${build.level}** · ${localizeText(o.mainSkillName, locale)}`,
    '',
    `| ${uiText(locale, '进攻指标', 'Offence')} | ${uiText(locale, '数值', 'Value')} | ${uiText(locale, '防御指标', 'Defence')} | ${uiText(locale, '数值', 'Value')} |`,
    '| --- | ---: | --- | ---: |',
    `| ${uiText(locale, '总 DPS', 'Total DPS')} | **${fmt(o.totalDps)}** | ${uiText(locale, '生命 / 护盾', 'Life / ES')} | ${fmt(d.life)} / ${fmt(d.energyShield)} |`,
    ...(o.fullDps
      ? [
          `| Full DPS | **${fmt(o.fullDps)}** | ${uiText(locale, '有效血池 (EHP)', 'Effective HP')} | **${fmt(d.effectiveHitPool)}** |`,
        ]
      : [
          `| ${uiText(locale, '击中 DPS', 'Hit DPS')} | ${fmt(o.hitDps)} | ${uiText(locale, '有效血池 (EHP)', 'Effective HP')} | **${fmt(d.effectiveHitPool)}** |`,
        ]),
    `| ${uiText(locale, '攻速/施速', 'Speed')} | ${o.speed.toFixed(2)} /s | ${uiText(locale, '护甲 / 闪避', 'Armour / Evasion')} | ${fmt(d.armour)} / ${fmt(d.evasion)} |`,
    `| ${uiText(locale, '暴击 / 爆伤', 'Crit / Multi')} | ${o.critChance.toFixed(1)}% / ${o.critMultiplier}% | ${uiText(locale, '元素 / 混沌抗', 'Ele / Chaos Res')} | ${d.fireResist}/${d.coldResist}/${d.lightningResist}/${d.chaosResist}% |`,
    `| ${uiText(locale, '命中率', 'Hit Chance')} | ${o.hitChance}% | ${uiText(locale, '力 / 敏 / 智', 'Str / Dex / Int')} | ${d.str} / ${d.dex} / ${d.int} |`,
  ];

  if (shareUrl) {
    lines.push('', `> WebPoB Share Link: ${shareUrl}`);
  }
  return lines.join('\n');
}

export function downloadBuildSummaryPng(build: Build, calc: CalcOutput, locale: Locale): void {
  const width = 900;
  const height = 470;
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(2, 2);

  // Dark obsidian gradient background
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#0f1320');
  bg.addColorStop(1, '#090b11');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Outer golden border
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, width - 28, height - 28);

  const classes = getClassesForGame(build.game);
  const cls = classes.find((c) => c.id === build.classId);
  const asc = cls?.ascendancies.find((a) => a.id === build.ascendancyId);
  const classLabel = cls ? localizeText(cls.name, locale) : build.classId;
  const ascLabel = asc ? localizeText(asc.name, locale) : build.ascendancyId || '';
  const o = calc.offence;
  const d = calc.defence;

  // Header
  ctx.fillStyle = '#fbbf24';
  ctx.font = '700 13px sans-serif';
  ctx.fillText(build.game === 'poe2' ? 'WebPoB · PATH OF EXILE 2 (0.5)' : 'WebPoB · PATH OF EXILE 1 (3.30)', 36, 46);

  ctx.fillStyle = '#fef3c7';
  ctx.font = '700 26px sans-serif';
  ctx.fillText(build.name.slice(0, 42), 36, 80);

  ctx.fillStyle = '#9ca3af';
  ctx.font = '500 14px sans-serif';
  ctx.fillText(
    `${classLabel}${ascLabel ? ` · ${ascLabel}` : ''} · Lv.${build.level} · ${localizeText(o.mainSkillName, locale)}`,
    36,
    106,
  );

  // Headline DPS Banner (right side of header)
  const headlineLabel =
    o.fullDps && o.fullDps > 0
      ? uiText(locale, 'FULL DPS', 'FULL DPS')
      : uiText(locale, 'TOTAL DPS', 'TOTAL DPS');
  const headlineVal = o.fullDps && o.fullDps > 0 ? o.fullDps : o.totalDps;
  ctx.textAlign = 'right';
  ctx.fillStyle = o.fullDps && o.fullDps > 0 ? '#34d399' : '#f59e0b';
  ctx.font = '700 12px monospace';
  ctx.fillText(headlineLabel, width - 36, 48);
  ctx.font = '700 34px monospace';
  ctx.fillText(fmt(headlineVal), width - 36, 86);
  ctx.textAlign = 'left';

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(36, 124);
  ctx.lineTo(width - 36, 124);
  ctx.stroke();

  // Three Stat Panels: Offence, Defence, Resistances & Attributes
  const drawCard = (x: number, y: number, w: number, h: number, title: string, rows: Array<[string, string, string?]>) => {
    ctx.fillStyle = 'rgba(18, 22, 35, 0.92)';
    ctx.strokeStyle = '#252d44';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#f3cc82';
    ctx.font = '700 12px sans-serif';
    ctx.fillText(title, x + 14, y + 24);

    let ry = y + 50;
    for (const [k, v, color] of rows) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 13px sans-serif';
      ctx.fillText(k, x + 14, ry);
      ctx.textAlign = 'right';
      ctx.fillStyle = color ?? '#f8fafc';
      ctx.font = '700 13px monospace';
      ctx.fillText(v, x + w - 14, ry);
      ctx.textAlign = 'left';
      ry += 28;
    }
  };

  drawCard(36, 142, 264, 274, uiText(locale, '进攻统计 / OFFENCE', 'OFFENCE'), [
    [uiText(locale, '击中 DPS', 'Hit DPS'), fmt(o.hitDps), '#fde68a'],
    [uiText(locale, '平均击中', 'Average Hit'), fmt(o.averageHit)],
    [uiText(locale, '速度', 'Speed'), `${o.speed.toFixed(2)} /s`],
    [uiText(locale, '暴击率', 'Crit Chance'), `${o.critChance.toFixed(1)}%`, '#fde047'],
    [uiText(locale, '暴击伤害', 'Crit Multi'), `${o.critMultiplier}%`, '#fef08a'],
    [uiText(locale, '命中率', 'Hit Chance'), `${o.hitChance}%`],
    ...(o.igniteDps > 0 ? [[uiText(locale, '点燃 DPS', 'Ignite DPS'), fmt(o.igniteDps), '#fb923c'] as [string, string, string]] : []),
    ...((o.impaleDps ?? 0) > 0 ? [[uiText(locale, '穿刺 DPS', 'Impale DPS'), fmt(o.impaleDps!), '#fbbf24'] as [string, string, string]] : []),
  ]);

  drawCard(318, 142, 264, 274, uiText(locale, '防御与生存 / DEFENCE', 'DEFENCE'), [
    [uiText(locale, '最大生命', 'Life'), fmt(d.life), '#fb7185'],
    [uiText(locale, '能量护盾', 'Energy Shield'), fmt(d.energyShield), '#38bdf8'],
    ...((d.ward ?? 0) > 0 ? [[uiText(locale, '结界 Ward', 'Ward'), fmt(d.ward!), '#a5b4fc'] as [string, string, string]] : []),
    [uiText(locale, '护甲 / 闪避', 'Armour / Eva'), `${fmt(d.armour)} / ${fmt(d.evasion)}`],
    [uiText(locale, '有效血池 EHP', 'Effective HP'), fmt(d.effectiveHitPool), '#34d399'],
    [uiText(locale, '最大物理承伤', 'Max Phys Hit'), fmt(d.maxPhysHitTaken)],
    [uiText(locale, '最大元素承伤', 'Max Ele Hit'), fmt(d.maxEleHitTaken)],
  ]);

  drawCard(600, 142, 264, 274, uiText(locale, '抗性与属性 / RES & ATTRS', 'RESISTS & ATTRIBUTES'), [
    [uiText(locale, '火焰抗性', 'Fire Res'), `${d.fireResist}%`, d.fireResist >= d.fireMaxResist ? '#34d399' : '#fb7185'],
    [uiText(locale, '冰霜抗性', 'Cold Res'), `${d.coldResist}%`, d.coldResist >= d.coldMaxResist ? '#34d399' : '#fb7185'],
    [uiText(locale, '闪电抗性', 'Lightning Res'), `${d.lightningResist}%`, d.lightningResist >= d.lightningMaxResist ? '#34d399' : '#fb7185'],
    [uiText(locale, '混沌抗性', 'Chaos Res'), `${d.chaosResist}%`, d.chaosResist >= 0 ? '#c084fc' : '#fb7185'],
    [uiText(locale, '力量 / 敏捷 / 智慧', 'Str / Dex / Int'), `${d.str} / ${d.dex} / ${d.int}`],
    [uiText(locale, '已分配天赋', 'Passives'), `${calc.allocatedPoints}`],
    ...(build.game === 'poe2' ? [[uiText(locale, '精魂 Spirit', 'Spirit'), `${d.spiritUnreserved} / ${d.spirit}`, '#fbbf24'] as [string, string, string]] : []),
  ]);

  // Footer
  ctx.fillStyle = '#64748b';
  ctx.font = '500 11px monospace';
  ctx.fillText('Generated by WebPoB · Open-Source Pure TypeScript Path of Building (PoE 1 & PoE 2)', 36, height - 26);

  const link = document.createElement('a');
  const safeName = build.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g, '_').slice(0, 40) || 'WebPoB_Build';
  link.download = `WebPoB_${safeName}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
