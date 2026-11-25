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

          <label className="flex items-center justify-between gap-2 pt-1">
            <span className="text-orange-300">
              {locale === 'zh-CN'
                ? '怒火层数 (Rage, 每层 +1% 攻击总增)'
                : 'Rage Stacks (1% more Attack Dmg each)'}
            </span>
            <input
              type="number"
              min={0}
              max={100}
              value={cfg.rage ?? 0}
              onChange={(e) =>
                updateConfig({ rage: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })
              }
              className="pob-input rounded w-16 px-2 py-1 text-center font-mono"
            />
          </label>

          <label className="flex items-center justify-between gap-2 pt-1">
            <span className="flex items-center gap-2 text-amber-200">
              <input
                type="checkbox"
                checked={Boolean(cfg.fortified)}
                onChange={(e) =>
                  updateConfig({
                    fortified: e.target.checked,
                    fortificationStacks: cfg.fortificationStacks ?? 20,
                  })
                }
                className="accent-amber-500"
              />
              {locale === 'zh-CN'
                ? '护体层数 (Fortify, 每层 -1% 击中承伤)'
                : 'Fortified (1% less Hit Dmg Taken / stack)'}
            </span>
            <input
              type="number"
              min={0}
              max={40}
              value={cfg.fortificationStacks ?? 20}
              onChange={(e) =>
                updateConfig({
                  fortificationStacks: Math.max(0, Math.min(40, Number(e.target.value) || 0)),
                })
              }
              className="pob-input rounded w-16 px-2 py-1 text-center font-mono"
            />
          </label>

          {build.game === 'poe1' && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#242a3c]">
              <span className="text-sky-300">
                {locale === 'zh-CN' ? '防卫技能 (Guard Skill)' : 'Active Guard Skill'}
              </span>
              <select
                value={cfg.activeGuardSkill ?? 'None'}
                onChange={(e) =>
                  updateConfig({
                    activeGuardSkill: e.target.value as NonNullable<BuildConfig['activeGuardSkill']>,
                  })
                }
                className="pob-input rounded px-2 py-1 text-xs"
              >
                <option value="None">{locale === 'zh-CN' ? '无 (None)' : 'None'}</option>
                <option value="MoltenShell">
                  {locale === 'zh-CN' ? '熔岩护盾 (Molten Shell Lv.20)' : 'Molten Shell (Lv.20)'}
                </option>
                <option value="Steelskin">
                  {locale === 'zh-CN' ? '钢铁之肤 (Steelskin Lv.20)' : 'Steelskin (Lv.20)'}
                </option>
                <option value="ArcaneCloak">
                  {locale === 'zh-CN' ? '奥术斗篷 (Arcane Cloak Lv.20)' : 'Arcane Cloak (Lv.20)'}
                </option>
              </select>
            </div>
          )}

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

          {build.game === 'poe1' && (
            <div className="space-y-2 pt-2 border-t border-[#242a3c]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-amber-200/90">
                  {locale === 'zh-CN' ? '众神殿·主神 (Major)' : 'Pantheon Major'}
                </span>
                <select
                  value={cfg.pantheonMajor ?? 'None'}
                  onChange={(e) =>
                    updateConfig({
                      pantheonMajor: e.target.value as NonNullable<BuildConfig['pantheonMajor']>,
                    })
                  }
                  className="pob-input rounded px-2 py-1 text-xs"
                >
                  <option value="None">{locale === 'zh-CN' ? '无 (None)' : 'None'}</option>
                  <option value="BrineKing">
                    {locale === 'zh-CN' ? '惊海之王 (Brine King)' : 'Soul of the Brine King'}
                  </option>
                  <option value="Lunaris">
                    {locale === 'zh-CN' ? '月影女神 (Lunaris +1% PDR)' : 'Soul of Lunaris (+1% PDR)'}
                  </option>
                  <option value="Solaris">
                    {locale === 'zh-CN' ? '日耀女神 (Solaris +6% PDR)' : 'Soul of Solaris (+6% PDR)'}
                  </option>
                  <option value="Arakaali">
                    {locale === 'zh-CN' ? '暗影女皇 (Arakaali)' : 'Soul of Arakaali'}
                  </option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-amber-200/90">
                  {locale === 'zh-CN' ? '众神殿·次神 (Minor)' : 'Pantheon Minor'}
                </span>
                <select
                  value={cfg.pantheonMinor ?? 'None'}
                  onChange={(e) =>
                    updateConfig({
                      pantheonMinor: e.target.value as NonNullable<BuildConfig['pantheonMinor']>,
                    })
                  }
                  className="pob-input rounded px-2 py-1 text-xs"
                >
                  <option value="None">{locale === 'zh-CN' ? '无 (None)' : 'None'}</option>
                  <option value="Abberath">
                    {locale === 'zh-CN' ? '艾贝拉斯 (Abberath)' : 'Soul of Abberath'}
                  </option>
                  <option value="Gruthkul">
                    {locale === 'zh-CN' ? '格鲁斯寇 (Gruthkul +5% PDR)' : 'Soul of Gruthkul (+5% PDR)'}
                  </option>
                  <option value="Ralakesh">
                    {locale === 'zh-CN' ? '芮勒盖许 (Ralakesh)' : 'Soul of Ralakesh'}
                  </option>
                  <option value="Shakari">
                    {locale === 'zh-CN' ? '沙卡丽 (Shakari +5% 混沌减伤)' : 'Soul of Shakari (+5% Chaos DR)'}
                  </option>
                  <option value="Tukohama">
                    {locale === 'zh-CN' ? '图克哈玛 (Tukohama +2% 回复/+3% PDR)' : 'Soul of Tukohama (+2% Regen / +3% PDR)'}
                  </option>
                  <option value="Garukhan">
                    {locale === 'zh-CN' ? '绝望之母 (Garukhan +5% 移速)' : 'Soul of Garukhan (+5% Move Speed)'}
                  </option>
                </select>
              </div>
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
              onChange={(e) => {
                const nextBoss = e.target.value as BuildConfig['enemyIsBoss'];
                const preset =
                  nextBoss === 'Pinnacle'
                    ? { enemyFireResist: 50, enemyColdResist: 50, enemyLightningResist: 50, enemyChaosResist: 30 }
                    : nextBoss === 'Guardian'
                      ? { enemyFireResist: 40, enemyColdResist: 40, enemyLightningResist: 40, enemyChaosResist: 25 }
                      : { enemyFireResist: 0, enemyColdResist: 0, enemyLightningResist: 0, enemyChaosResist: 0 };
                updateConfig({ enemyIsBoss: nextBoss, ...preset });
              }}
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

      {/* Endgame Buffs, Debuffs & Exposure (Phase 6 PoB Parity) */}
      <div className="pob-panel rounded-lg p-4 space-y-3 text-xs">
        <h3 className="font-bold text-amber-300 border-b border-[#242a3c] pb-1.5">
          {locale === 'zh-CN'
            ? '终局战斗增益 / 敌人减益与曝露 (PoB 完整对齐)'
            : 'Endgame Buffs, Debuffs & Exposure'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-2.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(cfg.conditionLowLife)}
              onChange={(e) => updateConfig({ conditionLowLife: e.target.checked })}
              className="accent-rose-500"
            />
            <span>
              {locale === 'zh-CN'
                ? '处于低血状态 (触发苦痛灵曲 30% 更多法伤)'
                : 'Are you on Low Life? (Pain Attunement)'}
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(cfg.buffArcaneSurge)}
              onChange={(e) => updateConfig({ buffArcaneSurge: e.target.checked })}
              className="accent-sky-400"
            />
            <span>
              {locale === 'zh-CN'
                ? '秘术增强 (+20% 施法速度 / +30% 魔力回复)'
                : 'Arcane Surge (+20% Cast Speed / +30% Mana Regen)'}
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(cfg.buffTailwind)}
              onChange={(e) => updateConfig({ buffTailwind: e.target.checked })}
              className="accent-emerald-400"
            />
            <span>
              {locale === 'zh-CN'
                ? '顺风 (+8% 行动速度 / 攻速施速移速更多)'
                : 'Tailwind (+8% Action Speed)'}
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(cfg.enemyIntimidated)}
              onChange={(e) => updateConfig({ enemyIntimidated: e.target.checked })}
              className="accent-orange-400"
            />
            <span>
              {locale === 'zh-CN'
                ? '敌人被恐吓 (+10% 承受攻击伤害)'
                : 'Enemy Intimidated (+10% Attack Dmg Taken)'}
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(cfg.enemyUnnerved)}
              onChange={(e) => updateConfig({ enemyUnnerved: e.target.checked })}
              className="accent-purple-400"
            />
            <span>
              {locale === 'zh-CN'
                ? '敌人被胆怯 (+10% 承受法术伤害)'
                : 'Enemy Unnerved (+10% Spell Dmg Taken)'}
            </span>
          </label>

          <label className="flex items-center justify-between gap-2">
            <span className="text-purple-200">
              {locale === 'zh-CN' ? '凋零层数 (0–15, 每层+6%混沌承伤)' : 'Withered Stacks (0–15)'}
            </span>
            <input
              type="number"
              min={0}
              max={15}
              value={cfg.witheredStacks ?? 0}
              onChange={(e) =>
                updateConfig({ witheredStacks: Math.max(0, Math.min(15, Number(e.target.value) || 0)) })
              }
              className="pob-input rounded w-16 px-2 py-1 text-center font-mono"
            />
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(cfg.enemyFireExposure)}
              onChange={(e) => updateConfig({ enemyFireExposure: e.target.checked })}
              className="accent-orange-500"
            />
            <span className="text-orange-300">
              {locale === 'zh-CN' ? '火焰曝露 (-10% 火抗 / 元素使 -35%)' : 'Fire Exposure (-10% Fire Res)'}
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(cfg.enemyColdExposure)}
              onChange={(e) => updateConfig({ enemyColdExposure: e.target.checked })}
              className="accent-sky-400"
            />
            <span className="text-sky-300">
              {locale === 'zh-CN' ? '冰霜曝露 (-10% 冰抗 / 元素使 -35%)' : 'Cold Exposure (-10% Cold Res)'}
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(cfg.enemyLightningExposure)}
              onChange={(e) => updateConfig({ enemyLightningExposure: e.target.checked })}
              className="accent-yellow-400"
            />
            <span className="text-yellow-300">
              {locale === 'zh-CN' ? '闪电曝露 (-10% 雷抗 / 元素使 -35%)' : 'Lightning Exposure (-10% Light Res)'}
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(cfg.enemyBlinded)}
              onChange={(e) => updateConfig({ enemyBlinded: e.target.checked })}
              className="accent-cyan-400"
            />
            <span className="text-cyan-200">
              {locale === 'zh-CN' ? '敌人被致盲 (-20% 敌人命中, 提升闪避率)' : 'Enemy Blinded (-20% Enemy Accuracy)'}
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(cfg.enemyTaunted)}
              onChange={(e) => updateConfig({ enemyTaunted: e.target.checked })}
              className="accent-amber-400"
            />
            <span className="text-amber-200">
              {locale === 'zh-CN' ? '敌人被嘲讽 (触发冠军 Worthy Foe 等增伤/必中)' : 'Enemy Taunted (Worthy Foe)'}
            </span>
          </label>
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
