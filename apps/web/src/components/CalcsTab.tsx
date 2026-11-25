import { useEffect, useMemo, useState } from 'react';
import { GitCompare, Zap } from 'lucide-react';
import { DAMAGE_TYPES, type Build } from '@webpob/core';
import { getSampleBuild } from '@webpob/data';
import { calculateBuild } from '@webpob/calc';
import { DAMAGE_TYPE_LABELS, localizeText, t } from '@webpob/i18n';
import { useWebPobStore } from '../store/useWebPobStore';
import { listSavedBuilds, type SavedBuildRecord } from '../storage/buildLibrary';

const DMG_COLOR: Record<string, string> = {
  Physical: 'text-zinc-200',
  Fire: 'text-orange-400',
  Cold: 'text-sky-300',
  Lightning: 'text-yellow-300',
  Chaos: 'text-purple-400',
};

export function CalcsTab() {
  const { locale, build, calc } = useWebPobStore();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [savedBuilds, setSavedBuilds] = useState<SavedBuildRecord[]>([]);
  const [compareId, setCompareId] = useState<string>('sample_current_game');

  useEffect(() => {
    void listSavedBuilds().then(setSavedBuilds);
  }, [build.id]);

  const compareTargets = useMemo(() => {
    const sample = getSampleBuild(build.game);
    const list: Array<{ id: string; label: string; build: Build }> = [
      {
        id: 'sample_current_game',
        label:
          locale === 'zh-CN'
            ? `官方默认示例 (${sample.name})`
            : `Default Sample (${sample.name})`,
        build: sample,
      },
      ...savedBuilds.map((r) => ({
        id: r.id,
        label: `${r.name} (Lv.${r.level} ${r.classId})`,
        build: r.build,
      })),
    ];
    return list;
  }, [build.game, savedBuilds, locale]);

  const comparedTarget = compareTargets.find((c) => c.id === compareId) ?? compareTargets[0];
  const comparedCalc = useMemo(
    () => (comparedTarget ? calculateBuild(comparedTarget.build) : null),
    [comparedTarget],
  );

  // Live Quick Scenario What-If Analysis (Flasks, Charges, Pinnacle Boss, +2 Gem Level, Shock/Onslaught)
  const scenarioRows = useMemo(() => {
    const baseDps = calc.offence.fullDps ?? calc.offence.totalDps;
    const baseEhp = calc.defence.effectiveHitPool;
    const allFlaskSlots = (['Flask 1', 'Flask 2', 'Flask 3', 'Flask 4', 'Flask 5'] as const).reduce(
      (acc, slot) => {
        if (build.equipped[slot]) acc[slot] = true;
        return acc;
      },
      {} as NonNullable<Build['activeFlaskSlots']>,
    );

    const scenarios: Array<{ id: string; labelEn: string; labelZh: string; mutate: (b: Build) => Build }> = [
      {
        id: 'plus2_gem',
        labelEn: '+2 to All Skill Gems (What-If)',
        labelZh: '假设所有技能宝石等级 +2',
        mutate: (b) => ({
          ...b,
          config: {
            ...b.config,
            customMods: `${b.config.customMods ? `${b.config.customMods}\n` : ''}+2 to Level of all Skill Gems`,
          },
        }),
      },
      {
        id: 'pinnacle',
        labelEn: 'vs Pinnacle Boss (50% Ele / 30% Chaos Res)',
        labelZh: '对阵巅峰 Boss（高抗性）',
        mutate: (b) => ({
          ...b,
          config: {
            ...b.config,
            enemyIsBoss: 'Pinnacle',
            enemyFireResist: 50,
            enemyColdResist: 50,
            enemyLightningResist: 50,
            enemyChaosResist: 30,
          },
        }),
      },
      {
        id: 'mapping',
        labelEn: 'vs Normal Mapping Mob (0% Resist)',
        labelZh: '对阵普通刷图怪物（0% 抗性）',
        mutate: (b) => ({
          ...b,
          config: {
            ...b.config,
            enemyIsBoss: 'None',
            enemyFireResist: 0,
            enemyColdResist: 0,
            enemyLightningResist: 0,
            enemyChaosResist: 0,
            enemyArmour: 0,
          },
        }),
      },
      {
        id: 'no_charges',
        labelEn: 'Without Any Charges / Onslaught',
        labelZh: '无充能球与猛攻（裸状态）',
        mutate: (b) => ({
          ...b,
          config: {
            ...b.config,
            usePowerCharges: false,
            useFrenzyCharges: false,
            useEnduranceCharges: false,
            onslaught: false,
          },
        }),
      },
      {
        id: 'full_buffs',
        labelEn: 'Full Charges (3/3/3) + Onslaught + 20% Shock',
        labelZh: '满三球 (3/3/3) + 猛攻 + 20% 感电',
        mutate: (b) => ({
          ...b,
          config: {
            ...b.config,
            usePowerCharges: true,
            powerCharges: Math.max(3, b.config.powerCharges),
            useFrenzyCharges: true,
            frenzyCharges: Math.max(3, b.config.frenzyCharges),
            useEnduranceCharges: true,
            enduranceCharges: Math.max(3, b.config.enduranceCharges),
            onslaught: true,
            enemyShocked: true,
            shockValue: Math.max(20, b.config.shockValue),
          },
        }),
      },
      {
        id: 'all_flasks',
        labelEn: Object.keys(allFlaskSlots).length > 0 ? 'All Equipped Flasks Active' : 'No Equipped Flasks (Baseline)',
        labelZh: Object.keys(allFlaskSlots).length > 0 ? '全部已装备药剂开启' : '未装备药剂（基准）',
        mutate: (b) => ({
          ...b,
          activeFlaskSlots: allFlaskSlots,
        }),
      },
    ];

    return scenarios.map((sc) => {
      const res = calculateBuild(sc.mutate(build));
      const nextDps = res.offence.fullDps ?? res.offence.totalDps;
      const nextEhp = res.defence.effectiveHitPool;
      const dpsDelta = nextDps - baseDps;
      const dpsPct = baseDps > 0 ? (dpsDelta / baseDps) * 100 : 0;
      const ehpDelta = nextEhp - baseEhp;
      const ehpPct = baseEhp > 0 ? (ehpDelta / baseEhp) * 100 : 0;
      return {
        id: sc.id,
        label: locale === 'zh-CN' ? sc.labelZh : sc.labelEn,
        nextDps,
        dpsPct,
        nextEhp,
        ehpPct,
      };
    });
  }, [build, calc, locale]);

  const selectedRow = calc.breakdowns[selectedIdx] ?? calc.breakdowns[0];

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">
      <div>
        <h2 className="text-base font-bold text-amber-200">{t(locale, 'calcs.title')}</h2>
        <p className="text-xs text-zinc-400 mt-0.5">{t(locale, 'calcs.subtitle')}</p>
      </div>

      {/* Main Skill Damage Table */}
      <div className="pob-panel rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-amber-200 uppercase tracking-wider">
            {t(locale, 'calcs.damageBreakdown')} — {localizeText(calc.offence.mainSkillName, locale)}
            {calc.offence.mainSkillLevel !== undefined && (
              <span className="ml-2 font-mono text-[11px] font-normal text-cyan-300 normal-case">
                Lv.{calc.offence.mainSkillLevel}
                {calc.offence.mainSkillBaseLevel !== undefined &&
                  calc.offence.mainSkillLevel > calc.offence.mainSkillBaseLevel &&
                  ` (+${calc.offence.mainSkillLevel - calc.offence.mainSkillBaseLevel})`}
                {calc.offence.mainSkillQuality ? ` · Q${calc.offence.mainSkillQuality}%` : ''}
              </span>
            )}
          </h3>
          <span className="text-xs font-mono text-amber-300">
            Total DPS: {Math.round(calc.offence.totalDps).toLocaleString()}
          </span>
        </div>
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-[#242a3c] text-zinc-400">
              <th className="py-1.5">{t(locale, 'calcs.damageType')}</th>
              <th className="py-1.5 text-right">{t(locale, 'calcs.min')}</th>
              <th className="py-1.5 text-right">{t(locale, 'calcs.max')}</th>
              <th className="py-1.5 text-right">{t(locale, 'calcs.avg')}</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {DAMAGE_TYPES.map((dt) => {
              const range = calc.offence.damageByType[dt];
              const label =
                locale === 'zh-CN' ? DAMAGE_TYPE_LABELS[dt]?.zh ?? dt : DAMAGE_TYPE_LABELS[dt]?.en ?? dt;
              return (
                <tr key={dt} className="border-b border-[#1c2130]">
                  <td className={`py-1.5 font-sans font-semibold ${DMG_COLOR[dt]}`}>{label}</td>
                  <td className="py-1.5 text-right text-zinc-300">{range.min.toLocaleString()}</td>
                  <td className="py-1.5 text-right text-zinc-300">{range.max.toLocaleString()}</td>
                  <td className="py-1.5 text-right font-bold text-zinc-100">{range.average.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stat Breakdown Table + Source Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 pob-panel rounded-lg p-4">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#242a3c] text-zinc-400">
                <th className="py-1.5">{t(locale, 'calcs.stat')}</th>
                <th className="py-1.5 text-right">{t(locale, 'calcs.base')}</th>
                <th className="py-1.5 text-right">{t(locale, 'calcs.inc')}</th>
                <th className="py-1.5 text-right">{t(locale, 'calcs.more')}</th>
                <th className="py-1.5 text-right">{t(locale, 'calcs.total')}</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {calc.breakdowns.map((row, idx) => (
                <tr
                  key={row.label}
                  onClick={() => setSelectedIdx(idx)}
                  className={`border-b border-[#1b2030] cursor-pointer transition ${
                    idx === selectedIdx ? 'bg-amber-500/15' : 'hover:bg-[#191e2c]'
                  }`}
                >
                  <td className="py-2 font-sans font-medium text-zinc-200">
                    {locale === 'zh-CN' ? row.labelZh : row.label}
                  </td>
                  <td className="py-2 text-right text-zinc-300">{Math.round(row.base).toLocaleString()}</td>
                  <td className="py-2 text-right text-sky-300">
                    {row.incPct >= 0 ? `+${Math.round(row.incPct)}%` : `${Math.round(row.incPct)}%`}
                  </td>
                  <td className="py-2 text-right text-amber-300">×{row.moreMultiplier.toFixed(2)}</td>
                  <td className="py-2 text-right font-bold text-emerald-300">
                    {Math.round(row.total).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Source Attribution Panel */}
        <div className="lg:col-span-5 pob-panel rounded-lg p-4">
          <h3 className="text-xs font-bold text-amber-200 border-b border-[#242a3c] pb-2 mb-2.5">
            {t(locale, 'calcs.sources')} —{' '}
            {selectedRow ? (locale === 'zh-CN' ? selectedRow.labelZh : selectedRow.label) : ''}
          </h3>
          <div className="space-y-1 max-h-96 overflow-y-auto text-xs">
            {selectedRow?.sources.map((src, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 rounded bg-[#0c0e15] px-2.5 py-1.5 border border-[#1f2436]"
              >
                <span className="text-zinc-300 truncate">{src.source}</span>
                <span className="font-mono shrink-0">
                  <span className="text-[10px] px-1 py-0.5 rounded bg-[#1b2133] text-zinc-400 mr-1.5">
                    {src.type}
                  </span>
                  <span className="text-amber-200 font-semibold">
                    {typeof src.value === 'number'
                      ? src.type === 'BASE'
                        ? `+${src.value}`
                        : `${src.value}%`
                      : src.value}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Combat Scenario & What-If Simulator */}
      <div className="pob-panel rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#242a3c] pb-2">
          <h3 className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            {locale === 'zh-CN' ? '快速情景与假设收益模拟 (What-If)' : 'Quick Combat Scenario & What-If Simulator'}
          </h3>
          <span className="text-[10px] text-zinc-400">
            {locale === 'zh-CN' ? '基于当前构筑实时重算' : 'Simulated live from current build'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {scenarioRows.map((row) => (
            <div
              key={row.id}
              className="rounded bg-[#0c0e15] border border-[#1f2436] px-3 py-2 flex flex-col justify-between gap-1.5"
            >
              <div className="text-xs text-zinc-200 font-medium">{row.label}</div>
              <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                <span
                  className={
                    Math.abs(row.dpsPct) < 0.05
                      ? 'text-zinc-500'
                      : row.dpsPct > 0
                        ? 'text-emerald-400 font-semibold'
                        : 'text-rose-400 font-semibold'
                  }
                >
                  DPS {row.dpsPct > 0 ? '+' : ''}
                  {row.dpsPct.toFixed(1)}%
                  <span className="text-[10px] text-zinc-400 font-normal ml-1">
                    ({Math.round(row.nextDps).toLocaleString()})
                  </span>
                </span>
                <span
                  className={
                    Math.abs(row.ehpPct) < 0.05
                      ? 'text-zinc-500'
                      : row.ehpPct > 0
                        ? 'text-sky-300 font-semibold'
                        : 'text-rose-400 font-semibold'
                  }
                >
                  EHP {row.ehpPct > 0 ? '+' : ''}
                  {row.ehpPct.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Side-by-Side Build Compare (Current vs Saved Library / Baseline) */}
      {comparedCalc && comparedTarget && (
        <div className="pob-panel rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#242a3c] pb-2">
            <h3 className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
              <GitCompare className="w-4 h-4 text-sky-400" />
              {locale === 'zh-CN' ? 'BD 属性对比 (当前构筑 vs 对比目标)' : 'Build Compare (Current vs Target)'}
            </h3>
            <select
              value={comparedTarget.id}
              onChange={(e) => setCompareId(e.target.value)}
              className="pob-input rounded px-2.5 py-1 text-xs"
            >
              {compareTargets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#242a3c] text-zinc-400">
                  <th className="py-1.5">{locale === 'zh-CN' ? '核心指标' : 'Metric'}</th>
                  <th className="py-1.5 text-right">{locale === 'zh-CN' ? '对比基准' : 'Baseline'}</th>
                  <th className="py-1.5 text-right">{locale === 'zh-CN' ? '当前 BD' : 'Current'}</th>
                  <th className="py-1.5 text-right">{locale === 'zh-CN' ? '差值 (Δ)' : 'Delta (Δ)'}</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {(
                  [
                    [locale === 'zh-CN' ? '总 DPS' : 'Total DPS', comparedCalc.offence.totalDps, calc.offence.totalDps, false],
                    [locale === 'zh-CN' ? '击中 DPS' : 'Hit DPS', comparedCalc.offence.hitDps, calc.offence.hitDps, false],
                    [locale === 'zh-CN' ? '攻击/施法速度' : 'Speed (/s)', comparedCalc.offence.speed, calc.offence.speed, true],
                    [locale === 'zh-CN' ? '暴击率 (%)' : 'Crit Chance (%)', comparedCalc.offence.critChance, calc.offence.critChance, true],
                    [locale === 'zh-CN' ? '最大生命' : 'Maximum Life', comparedCalc.defence.life, calc.defence.life, false],
                    [locale === 'zh-CN' ? '最大能量护盾' : 'Energy Shield', comparedCalc.defence.energyShield, calc.defence.energyShield, false],
                    [locale === 'zh-CN' ? '有效生命池 (EHP)' : 'Effective Hit Pool', comparedCalc.defence.effectiveHitPool, calc.defence.effectiveHitPool, false],
                    [locale === 'zh-CN' ? '护甲' : 'Armour', comparedCalc.defence.armour, calc.defence.armour, false],
                    [locale === 'zh-CN' ? '闪避值' : 'Evasion', comparedCalc.defence.evasion, calc.defence.evasion, false],
                    [locale === 'zh-CN' ? '物理最大承伤' : 'Max Phys Hit', comparedCalc.defence.maxPhysHitTaken, calc.defence.maxPhysHitTaken, false],
                    [locale === 'zh-CN' ? '元素最大承伤' : 'Max Ele Hit', comparedCalc.defence.maxEleHitTaken, calc.defence.maxEleHitTaken, false],
                  ] as Array<[string, number, number, boolean]>
                ).map(([label, baseVal, curVal, isFloat]) => {
                  const diff = curVal - baseVal;
                  const pct = baseVal > 0 ? (diff / baseVal) * 100 : curVal > 0 ? 100 : 0;
                  const fmt = (v: number) =>
                    isFloat ? v.toFixed(2) : Math.round(v).toLocaleString();
                  const color =
                    Math.abs(diff) < 0.01
                      ? 'text-zinc-500'
                      : diff > 0
                        ? 'text-emerald-400'
                        : 'text-rose-400';
                  return (
                    <tr key={label} className="border-b border-[#1b2030]">
                      <td className="py-1.5 font-sans text-zinc-200">{label}</td>
                      <td className="py-1.5 text-right text-zinc-400">{fmt(baseVal)}</td>
                      <td className="py-1.5 text-right font-semibold text-zinc-100">{fmt(curVal)}</td>
                      <td className={`py-1.5 text-right font-semibold ${color}`}>
                        {diff > 0 ? '+' : ''}
                        {fmt(diff)}
                        {Math.abs(diff) >= 0.01 && (
                          <span className="text-[10px] opacity-80 ml-1">
                            ({pct > 0 ? '+' : ''}
                            {pct.toFixed(1)}%)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
