import { AlertTriangle } from 'lucide-react';
import { localizeText, t } from '@webpob/i18n';
import { useWebPobStore } from '../store/useWebPobStore';

function fmtNum(n: number): string {
  return Math.round(n).toLocaleString();
}

function StatRow({
  label,
  value,
  valueClass = 'text-zinc-100',
  sub,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5 text-xs">
      <span className="text-zinc-400 truncate">{label}</span>
      <span className={`font-mono font-semibold tabular-nums whitespace-nowrap ${valueClass}`}>
        {value}
        {sub && <span className="text-[10px] text-zinc-500 font-normal ml-1">{sub}</span>}
      </span>
    </div>
  );
}

export function SidebarStats() {
  const { locale, build, calc, setMainSkillGroup } = useWebPobStore();
  const { offence, defence } = calc;

  const resColor = (val: number, max: number) =>
    val >= max ? 'text-emerald-400' : val >= 50 ? 'text-amber-300' : 'text-rose-400';

  return (
    <aside className="w-64 lg:w-72 shrink-0 border-r border-[#232838] bg-[#10131b] flex flex-col overflow-y-auto p-3 gap-3 select-none">
      {/* Main Skill Picker */}
      <div className="pob-panel rounded-md p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-amber-400/90 font-semibold mb-1.5">
          {t(locale, 'sidebar.mainSkill')}
        </div>
        <select
          value={build.mainSkillGroupId}
          onChange={(e) => setMainSkillGroup(e.target.value)}
          className="pob-input w-full rounded px-2 py-1 text-xs font-medium mb-2"
        >
          {build.skills.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
        <div className="flex items-baseline justify-between border-t border-[#232838] pt-2">
          <span className="text-xs text-zinc-400">{t(locale, 'sidebar.totalDps')}</span>
          <span className="text-lg font-mono font-bold text-amber-300 tabular-nums">
            {fmtNum(offence.totalDps)}
          </span>
        </div>
        <div className="text-[11px] text-zinc-400 truncate mt-0.5">
          {localizeText(offence.mainSkillName, locale)}
        </div>
      </div>

      {/* Offence */}
      <div className="pob-panel rounded-md p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold border-b border-[#232838] pb-1 mb-1.5">
          {t(locale, 'sidebar.offence')}
        </div>
        <StatRow label={t(locale, 'sidebar.hitDps')} value={fmtNum(offence.hitDps)} valueClass="text-amber-200" />
        {offence.igniteDps > 0 && (
          <StatRow label={t(locale, 'sidebar.igniteDps')} value={fmtNum(offence.igniteDps)} valueClass="text-orange-400" />
        )}
        {offence.bleedDps > 0 && (
          <StatRow label={t(locale, 'sidebar.bleedDps')} value={fmtNum(offence.bleedDps)} valueClass="text-rose-400" />
        )}
        <StatRow label={t(locale, 'sidebar.averageHit')} value={fmtNum(offence.averageHit)} />
        <StatRow label={t(locale, 'sidebar.speed')} value={`${offence.speed.toFixed(2)} /s`} />
        <StatRow label={t(locale, 'sidebar.critChance')} value={`${offence.critChance.toFixed(1)}%`} valueClass="text-yellow-300" />
        <StatRow label={t(locale, 'sidebar.critMulti')} value={`${offence.critMultiplier}%`} valueClass="text-yellow-200" />
        <StatRow label={t(locale, 'sidebar.hitChance')} value={`${offence.hitChance}%`} />
        <StatRow label={t(locale, 'sidebar.manaCost')} value={`${offence.manaCost}`} sub={`(${offence.manaPerSecond}/s)`} />
      </div>

      {/* Defence */}
      <div className="pob-panel rounded-md p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold border-b border-[#232838] pb-1 mb-1.5">
          {t(locale, 'sidebar.defence')}
        </div>
        <StatRow label={t(locale, 'sidebar.life')} value={fmtNum(defence.life)} valueClass="text-rose-400" sub={defence.lifeRegen > 0 ? `+${defence.lifeRegen}/s` : undefined} />
        <StatRow label={t(locale, 'sidebar.energyShield')} value={fmtNum(defence.energyShield)} valueClass="text-sky-400" />
        <StatRow label={t(locale, 'sidebar.mana')} value={`${fmtNum(defence.manaUnreserved)} / ${fmtNum(defence.mana)}`} valueClass="text-blue-400" />
        {build.game === 'poe2' && (
          <StatRow
            label={t(locale, 'sidebar.spirit')}
            value={`${defence.spiritUnreserved} / ${defence.spirit}`}
            valueClass={defence.spiritUnreserved < 0 ? 'text-rose-400' : 'text-amber-300'}
          />
        )}
        <StatRow label={t(locale, 'sidebar.armour')} value={fmtNum(defence.armour)} sub={`(${defence.physDamageReduction}% PDR)`} />
        <StatRow label={t(locale, 'sidebar.evasion')} value={fmtNum(defence.evasion)} sub={`(${defence.evadeChance}%)`} />
        <StatRow label={t(locale, 'sidebar.block')} value={`${defence.blockChance}% / ${defence.spellBlockChance}%`} />
        {build.game === 'poe1' && (
          <StatRow label={t(locale, 'sidebar.spellSuppress')} value={`${defence.spellSuppressionChance}%`} valueClass="text-emerald-300" />
        )}
        <StatRow label={t(locale, 'sidebar.moveSpeed')} value={`${defence.movementSpeedPct - 100 >= 0 ? '+' : ''}${defence.movementSpeedPct - 100}%`} />
        <div className="border-t border-[#232838] mt-1.5 pt-1.5">
          <StatRow label={t(locale, 'sidebar.ehp')} value={fmtNum(defence.effectiveHitPool)} valueClass="text-emerald-300" />
          <StatRow label={t(locale, 'sidebar.maxPhysHit')} value={fmtNum(defence.maxPhysHitTaken)} />
          <StatRow label={t(locale, 'sidebar.maxEleHit')} value={fmtNum(defence.maxEleHitTaken)} />
        </div>
      </div>

      {/* Resistances & Attributes */}
      <div className="pob-panel rounded-md p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold border-b border-[#232838] pb-1 mb-1.5">
          {t(locale, 'sidebar.resistances')}
        </div>
        <StatRow
          label={t(locale, 'sidebar.fireRes')}
          value={`${defence.fireResist}%`}
          sub={`(${defence.fireResist + defence.fireResistOvercap}%)`}
          valueClass={resColor(defence.fireResist, defence.fireMaxResist)}
        />
        <StatRow
          label={t(locale, 'sidebar.coldRes')}
          value={`${defence.coldResist}%`}
          sub={`(${defence.coldResist + defence.coldResistOvercap}%)`}
          valueClass={resColor(defence.coldResist, defence.coldMaxResist)}
        />
        <StatRow
          label={t(locale, 'sidebar.lightningRes')}
          value={`${defence.lightningResist}%`}
          sub={`(${defence.lightningResist + defence.lightningResistOvercap}%)`}
          valueClass={resColor(defence.lightningResist, defence.lightningMaxResist)}
        />
        <StatRow
          label={t(locale, 'sidebar.chaosRes')}
          value={`${defence.chaosResist}%`}
          valueClass={defence.chaosResist >= 75 ? 'text-purple-300' : defence.chaosResist >= 0 ? 'text-zinc-200' : 'text-rose-400'}
        />

        <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold border-t border-[#232838] pt-2 mt-2 mb-1">
          {t(locale, 'sidebar.attributes')}
        </div>
        <div className="grid grid-cols-3 gap-1 text-center text-xs font-mono">
          <div className="rounded bg-[#0b0d14] border border-[#232838] py-1">
            <div className="text-[10px] text-rose-400">{t(locale, 'sidebar.str')}</div>
            <div className="font-bold text-zinc-100">{defence.str}</div>
          </div>
          <div className="rounded bg-[#0b0d14] border border-[#232838] py-1">
            <div className="text-[10px] text-emerald-400">{t(locale, 'sidebar.dex')}</div>
            <div className="font-bold text-zinc-100">{defence.dex}</div>
          </div>
          <div className="rounded bg-[#0b0d14] border border-[#232838] py-1">
            <div className="text-[10px] text-sky-400">{t(locale, 'sidebar.int')}</div>
            <div className="font-bold text-zinc-100">{defence.int}</div>
          </div>
        </div>
      </div>

      {/* Passive Points Summary */}
      <div className="pob-panel rounded-md p-2.5 text-xs flex items-center justify-between">
        <span className="text-zinc-400">{t(locale, 'sidebar.points')}</span>
        <span className="font-mono font-semibold text-amber-200">
          {calc.allocatedPoints}
          {build.game === 'poe2' && (
            <span className="text-[10px] text-zinc-400 ml-1">
              (I:{calc.weaponSet1Points} / II:{calc.weaponSet2Points})
            </span>
          )}
        </span>
      </div>

      {/* Warnings */}
      {calc.warnings.length > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-950/25 p-2.5 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {t(locale, 'sidebar.warnings')}
          </div>
          {calc.warnings.map((w) => (
            <p key={w.code} className="text-[11px] text-amber-200/85 leading-snug">
              • {localizeText(w.message, locale)}
            </p>
          ))}
        </div>
      )}
    </aside>
  );
}
