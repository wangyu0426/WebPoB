import { useState } from 'react';
import { DAMAGE_TYPES } from '@webpob/core';
import { DAMAGE_TYPE_LABELS, localizeText, t } from '@webpob/i18n';
import { useWebPobStore } from '../store/useWebPobStore';

const DMG_COLOR: Record<string, string> = {
  Physical: 'text-zinc-200',
  Fire: 'text-orange-400',
  Cold: 'text-sky-300',
  Lightning: 'text-yellow-300',
  Chaos: 'text-purple-400',
};

export function CalcsTab() {
  const { locale, calc } = useWebPobStore();
  const [selectedIdx, setSelectedIdx] = useState(0);
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
    </div>
  );
}
