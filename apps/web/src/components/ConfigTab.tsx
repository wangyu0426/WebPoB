import type { Build, BuildConfig } from '@webpob/core';
import { t } from '@webpob/i18n';
import { useWebPobStore } from '../store/useWebPobStore';

export function ConfigTab() {
  const { locale, build, updateConfig, setBuildMeta } = useWebPobStore();
  const cfg = build.config;

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5 max-w-5xl">
      <h2 className="text-base font-bold text-amber-200">{t(locale, 'config.title')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Combat & Charges */}
        <div className="pob-panel rounded-lg p-4 space-y-3 text-xs">
          <h3 className="font-bold text-amber-300 border-b border-[#242a3c] pb-1.5">
            {t(locale, 'config.combat')}
          </h3>

          <label className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={cfg.usePowerCharges}
                onChange={(e) => updateConfig({ usePowerCharges: e.target.checked })}
                className="accent-amber-500"
              />
              {t(locale, 'config.powerCharges')}
            </span>
            <input
              type="number"
              min={0}
              max={15}
              value={cfg.powerCharges}
              onChange={(e) => updateConfig({ powerCharges: Number(e.target.value) || 0 })}
              className="pob-input rounded w-16 px-2 py-1 text-center font-mono"
            />
          </label>

          <label className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={cfg.useFrenzyCharges}
                onChange={(e) => updateConfig({ useFrenzyCharges: e.target.checked })}
                className="accent-amber-500"
              />
              {t(locale, 'config.frenzyCharges')}
            </span>
            <input
              type="number"
              min={0}
              max={15}
              value={cfg.frenzyCharges}
              onChange={(e) => updateConfig({ frenzyCharges: Number(e.target.value) || 0 })}
              className="pob-input rounded w-16 px-2 py-1 text-center font-mono"
            />
          </label>

          <label className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={cfg.useEnduranceCharges}
                onChange={(e) => updateConfig({ useEnduranceCharges: e.target.checked })}
                className="accent-amber-500"
              />
              {t(locale, 'config.enduranceCharges')}
            </span>
            <input
              type="number"
              min={0}
              max={15}
              value={cfg.enduranceCharges}
              onChange={(e) => updateConfig({ enduranceCharges: Number(e.target.value) || 0 })}
              className="pob-input rounded w-16 px-2 py-1 text-center font-mono"
            />
          </label>

          <label className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              checked={cfg.onslaught}
              onChange={(e) => updateConfig({ onslaught: e.target.checked })}
              className="accent-amber-500"
            />
            {t(locale, 'config.onslaught')}
          </label>

          <label className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={cfg.enemyShocked}
                onChange={(e) => updateConfig({ enemyShocked: e.target.checked })}
                className="accent-amber-500"
              />
              {t(locale, 'config.enemyShocked')}
            </span>
            <input
              type="number"
              min={0}
              max={100}
              value={cfg.shockValue}
              onChange={(e) => updateConfig({ shockValue: Number(e.target.value) || 0 })}
              className="pob-input rounded w-16 px-2 py-1 text-center font-mono"
            />
          </label>

          {build.game === 'poe1' && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#242a3c]">
              <span className="text-zinc-300">{t(locale, 'config.bandit')}</span>
              <select
                value={build.bandit ?? 'None'}
                onChange={(e) => setBuildMeta({ bandit: e.target.value as Build['bandit'] })}
                className="pob-input rounded px-2 py-1 text-xs"
              >
                <option value="None">Kill All (+1 Skill Point)</option>
                <option value="Alira">Alira (+15% All Res)</option>
                <option value="Oak">Oak (+40 Life)</option>
                <option value="Kraityn">Kraityn (+8% Move Speed)</option>
              </select>
            </div>
          )}
        </div>

        {/* Enemy Parameters */}
        <div className="pob-panel rounded-lg p-4 space-y-3 text-xs">
          <h3 className="font-bold text-amber-300 border-b border-[#242a3c] pb-1.5">
            {t(locale, 'config.enemy')}
          </h3>

          <div className="flex items-center justify-between gap-2">
            <span className="text-zinc-300">{t(locale, 'config.enemyType')}</span>
            <select
              value={cfg.enemyIsBoss}
              onChange={(e) => updateConfig({ enemyIsBoss: e.target.value as BuildConfig['enemyIsBoss'] })}
              className="pob-input rounded px-2 py-1 text-xs"
            >
              <option value="None">{t(locale, 'config.enemyNormal')}</option>
              <option value="Guardian">{t(locale, 'config.enemyGuardian')}</option>
              <option value="Pinnacle">{t(locale, 'config.enemyPinnacle')}</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-zinc-300">{t(locale, 'config.enemyLevel')}</span>
            <input
              type="number"
              min={1}
              max={100}
              value={cfg.enemyLevel}
              onChange={(e) => updateConfig({ enemyLevel: Number(e.target.value) || 84 })}
              className="pob-input rounded w-20 px-2 py-1 text-center font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {(
              [
                ['enemyFireResist', 'Fire Res %'],
                ['enemyColdResist', 'Cold Res %'],
                ['enemyLightningResist', 'Light Res %'],
                ['enemyChaosResist', 'Chaos Res %'],
              ] as const
            ).map(([field, label]) => (
              <div key={field} className="flex items-center justify-between gap-2">
                <span className="text-zinc-400">{label}</span>
                <input
                  type="number"
                  value={cfg[field]}
                  onChange={(e) => updateConfig({ [field]: Number(e.target.value) || 0 })}
                  className="pob-input rounded w-16 px-2 py-1 text-center font-mono"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Modifiers (Supports EN & ZH!) */}
      <div className="pob-panel rounded-lg p-4 space-y-2">
        <h3 className="text-xs font-bold text-amber-300">{t(locale, 'config.customMods')}</h3>
        <p className="text-[11px] text-zinc-400">{t(locale, 'config.customModsHint')}</p>
        <textarea
          rows={6}
          value={cfg.customMods}
          onChange={(e) => updateConfig({ customMods: e.target.value })}
          placeholder={'最大生命 +100\n闪电伤害提高 30%\n+25% to Global Critical Strike Multiplier'}
          className="pob-input w-full rounded p-3 text-xs font-mono"
        />
      </div>
    </div>
  );
}
