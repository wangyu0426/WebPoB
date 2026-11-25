import { useMemo, useState } from 'react';
import { Plus, Search, Sparkles, Star, Trash2 } from 'lucide-react';
import type { EquipmentSlotId, WeaponSetId } from '@webpob/core';
import { getGemsForGame, getRuleset } from '@webpob/data';
import { rankSupportGemsForGroup } from '@webpob/calc';
import { getSlotLabel, localizeStatLine, localizeText, t } from '@webpob/i18n';
import { useWebPobStore } from '../store/useWebPobStore';

const GEM_COLOR_BADGE: Record<string, string> = {
  red: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  green: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  blue: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  white: 'bg-zinc-200/20 text-zinc-100 border-zinc-400/40',
};

export function SkillsTab() {
  const {
    locale,
    build,
    treeRevision,
    setMainSkillGroup,
    addSkillGroup,
    removeSkillGroup,
    toggleSkillGroup,
    updateSkillGroup,
    addGemToGroup,
    removeGemFromGroup,
    updateGem,
  } = useWebPobStore();

  const [gemSearch, setGemSearch] = useState('');
  const [optimizerGroupId, setOptimizerGroupId] = useState<string | null>(null);
  void treeRevision;

  const rankedSupports = useMemo(() => {
    if (!optimizerGroupId) return [];
    return rankSupportGemsForGroup(build, optimizerGroupId, 8);
  }, [build, optimizerGroupId]);
  const gemsCatalog = getGemsForGame(build.game);
  const q = gemSearch.trim().toLowerCase();
  const filteredGems = q
    ? gemsCatalog.filter(
        (g) =>
          g.name.en.toLowerCase().includes(q) ||
          g.name.zh.toLowerCase().includes(q) ||
          g.tags.some((tag) => tag.toLowerCase().includes(q)),
      )
    : gemsCatalog;
  const activeGems = filteredGems.filter((g) => g.category === 'active').slice(0, 120);
  const supportGems = filteredGems.filter((g) => g.category === 'support').slice(0, 120);
  const ruleset = getRuleset(build.game);
  const socketableSlots: EquipmentSlotId[] = ruleset.equipmentSlots.filter(
    (s) => !s.startsWith('Flask') && !s.startsWith('Charm') && !s.startsWith('Ring') && s !== 'Amulet' && s !== 'Belt',
  );

  const toggleWeaponSet = (groupId: string, current: WeaponSetId[] | undefined, ws: WeaponSetId) => {
    const list = current ?? [1, 2];
    const next = list.includes(ws) ? list.filter((x) => x !== ws) : [...list, ws];
    updateSkillGroup(groupId, { weaponSets: next.length > 0 ? next : [ws] });
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-amber-200">{t(locale, 'skills.title')}</h2>
          <span className="text-[11px] font-mono text-zinc-400">
            {gemsCatalog.length} {locale === 'zh-CN' ? '颗官方技能宝石' : 'official gems'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={gemSearch}
              onChange={(e) => setGemSearch(e.target.value)}
              placeholder={locale === 'zh-CN' ? '过滤宝石（中/英文/标签）...' : 'Filter gems (EN/ZH/tag)...'}
              className="pob-input rounded pl-8 pr-2.5 py-1 text-xs w-56"
            />
          </div>
          <button
            type="button"
            onClick={addSkillGroup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {t(locale, 'skills.addGroup')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {build.skills.map((group) => {
          const isMain = group.id === build.mainSkillGroupId;
          return (
            <div
              key={group.id}
              className={`pob-panel rounded-lg p-4 space-y-3 ${
                isMain ? 'ring-1 ring-amber-500/60' : ''
              }`}
            >
              {/* Group Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#242a3c] pb-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={group.enabled}
                    onChange={() => toggleSkillGroup(group.id)}
                    className="accent-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={group.label}
                    onChange={(e) => updateSkillGroup(group.id, { label: e.target.value })}
                    className="pob-input rounded px-2 py-1 text-xs font-semibold w-44"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {(() => {
                    const activeInGroup = group.gems
                      .filter((gi) => gi.enabled)
                      .map((gi) => ({ gi, def: gemsCatalog.find((g) => g.id === gi.gemId) }))
                      .filter((x) => x.def && x.def.category === 'active' && !x.def.isAuraOrBuff);
                    if (activeInGroup.length < 2) return null;
                    return (
                      <select
                        value={group.mainActiveSkillIndex ?? 1}
                        onChange={(e) =>
                          updateSkillGroup(group.id, { mainActiveSkillIndex: Number(e.target.value) || 1 })
                        }
                        title={locale === 'zh-CN' ? '选择本组主计算主动技能（如 CoC 法术）' : 'Active skill to calculate (e.g. CoC spell)'}
                        className="pob-input rounded px-2 py-1 text-xs text-cyan-200 border-cyan-500/40"
                      >
                        {activeInGroup.map((item, idx) => (
                          <option key={item.gi.instanceId} value={idx + 1}>
                            #{idx + 1} {localizeText(item.def!.name, locale)}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                  {build.game === 'poe1' ? (
                    <select
                      value={group.slot ?? 'Body Armour'}
                      onChange={(e) =>
                        updateSkillGroup(group.id, { slot: e.target.value as EquipmentSlotId })
                      }
                      className="pob-input rounded px-2 py-1 text-xs"
                    >
                      {socketableSlots.map((s) => (
                        <option key={s} value={s}>
                          {getSlotLabel(locale, s)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-zinc-400">{t(locale, 'skills.weaponSets')}:</span>
                      {([1, 2] as const).map((ws) => {
                        const active = (group.weaponSets ?? [1, 2]).includes(ws);
                        return (
                          <button
                            key={ws}
                            type="button"
                            onClick={() => toggleWeaponSet(group.id, group.weaponSets, ws)}
                            className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                              active
                                ? ws === 1
                                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                                  : 'bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-400/40'
                                : 'bg-[#0b0d14] text-zinc-500 border border-[#252b3d]'
                            }`}
                          >
                            {ws === 1 ? 'I' : 'II'}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      updateSkillGroup(group.id, { includeInFullDps: !group.includeInFullDps })
                    }
                    title={
                      locale === 'zh-CN'
                        ? '计入全技能总 DPS（Full DPS，适合多图腾/召唤物/多技能并联）'
                        : 'Include this skill group in Full DPS aggregation'
                    }
                    className={`px-2 py-1 rounded text-xs cursor-pointer border transition ${
                      group.includeInFullDps
                        ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50 font-semibold'
                        : 'bg-[#1a1f2e] text-zinc-400 hover:text-emerald-200 border-[#2a3147]'
                    }`}
                  >
                    {locale === 'zh-CN' ? '计入总DPS' : 'Full DPS'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMainSkillGroup(group.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer ${
                      isMain
                        ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50 font-semibold'
                        : 'bg-[#1a1f2e] text-zinc-300 hover:text-amber-200 border border-[#2a3147]'
                    }`}
                  >
                    <Star className="w-3 h-3" />
                    {isMain ? t(locale, 'skills.mainSkill') : t(locale, 'skills.setAsMain')}
                  </button>

                  {build.skills.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSkillGroup(group.id)}
                      className="p-1.5 rounded text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                      title={t(locale, 'skills.removeGroup')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Gems List */}
              <div className="space-y-1.5">
                {group.gems.map((gemInst) => {
                  const def = gemsCatalog.find((g) => g.id === gemInst.gemId);
                  if (!def) return null;
                  return (
                    <div
                      key={gemInst.instanceId}
                      className="flex items-center justify-between gap-2 rounded bg-[#0c0e15] border border-[#212738] px-2.5 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={gemInst.enabled}
                          onChange={(e) =>
                            updateGem(group.id, gemInst.instanceId, { enabled: e.target.checked })
                          }
                          className="accent-amber-500 cursor-pointer"
                        />
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase shrink-0 ${
                            GEM_COLOR_BADGE[def.color]
                          }`}
                        >
                          {def.category === 'active' ? (def.isAuraOrBuff ? 'BUFF' : 'ACT') : 'SUP'}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-100 truncate">
                            {localizeText(def.name, locale)}
                            {def.spiritReservation && (
                              <span className="ml-2 text-[10px] text-amber-300 font-mono">
                                {def.spiritReservation} Spirit
                              </span>
                            )}
                            {def.manaReservationPct && (
                              <span className="ml-2 text-[10px] text-blue-300 font-mono">
                                {def.manaReservationPct}% Mana
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">
                            {def.stats.map((s) => localizeStatLine(s, locale)).join(' · ')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {def.category === 'active' && !def.isAuraOrBuff && (
                          <>
                            <label
                              className="text-[10px] text-emerald-400/90 font-mono"
                              title={locale === 'zh-CN' ? '同时生效数量（如 20 狂灵 / 4 图腾）' : 'Active instance count for Full DPS'}
                            >
                              ×
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={99}
                              value={gemInst.count ?? 1}
                              onChange={(e) =>
                                updateGem(group.id, gemInst.instanceId, {
                                  count: Math.max(1, Math.min(99, Number(e.target.value) || 1)),
                                })
                              }
                              title={locale === 'zh-CN' ? '同时生效数量（Full DPS 乘数）' : 'Active count multiplier'}
                              className="pob-input rounded w-11 px-1 py-0.5 text-center font-mono text-xs text-emerald-300"
                            />
                          </>
                        )}
                        <label className="text-[10px] text-zinc-400">{t(locale, 'skills.level')}</label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={gemInst.level}
                          onChange={(e) =>
                            updateGem(group.id, gemInst.instanceId, {
                              level: Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                            })
                          }
                          className="pob-input rounded w-12 px-1.5 py-0.5 text-center font-mono text-xs"
                        />
                        <label className="text-[10px] text-zinc-400">{t(locale, 'skills.quality')}</label>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={gemInst.quality}
                          onChange={(e) =>
                            updateGem(group.id, gemInst.instanceId, {
                              quality: Math.max(0, Math.min(30, Number(e.target.value) || 0)),
                            })
                          }
                          className="pob-input rounded w-12 px-1.5 py-0.5 text-center font-mono text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => removeGemFromGroup(group.id, gemInst.instanceId)}
                          className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Gem Dropdown + Smart Support DPS Recommender */}
              <div className="pt-1 space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        addGemToGroup(group.id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="pob-input flex-1 min-w-0 rounded px-2.5 py-1.5 text-xs"
                  >
                    <option value="">+ {t(locale, 'skills.addGem')}...</option>
                    <optgroup label={t(locale, 'skills.activeGems')}>
                      {activeGems.map((g) => (
                        <option key={g.id} value={g.id}>
                          {localizeText(g.name, locale)} ({locale === 'zh-CN' ? g.name.en : g.name.zh})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t(locale, 'skills.supportGems')}>
                      {supportGems.map((g) => (
                        <option key={g.id} value={g.id}>
                          {localizeText(g.name, locale)} ({locale === 'zh-CN' ? g.name.en : g.name.zh})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setOptimizerGroupId((cur) => (cur === group.id ? null : group.id))
                    }
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold border shrink-0 cursor-pointer transition ${
                      optimizerGroupId === group.id
                        ? 'bg-emerald-500/25 border-emerald-400/60 text-emerald-200'
                        : 'bg-[#161c2b] hover:bg-[#1e263a] border-emerald-500/35 text-emerald-300'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {locale === 'zh-CN' ? '按 DPS 推荐辅助' : 'Rank Supports'}
                  </button>
                </div>

                {optimizerGroupId === group.id && (
                  <div className="rounded bg-[#0a0d14] border border-emerald-500/35 p-2.5 space-y-1.5">
                    <div className="text-[11px] font-semibold text-emerald-300 flex items-center justify-between">
                      <span>
                        {locale === 'zh-CN'
                          ? '实时模拟最高 DPS 辅助宝石推荐 (Lv.20)'
                          : 'Top Compatible Support Gems by Live DPS Gain (Lv.20)'}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Top {rankedSupports.length}
                      </span>
                    </div>
                    {rankedSupports.length === 0 ? (
                      <div className="text-[11px] text-zinc-500 py-1">
                        {locale === 'zh-CN'
                          ? '未找到更高 DPS 增益的兼容辅助宝石（或此组仅含光环）'
                          : 'No compatible support gem with positive DPS gain found.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {rankedSupports.map((rec) => (
                          <button
                            key={rec.gem.id}
                            type="button"
                            onClick={() => addGemToGroup(group.id, rec.gem.id)}
                            className="flex items-center justify-between gap-2 rounded bg-[#111521] hover:bg-[#192033] border border-[#242c42] px-2 py-1.5 text-left text-xs cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-zinc-100 truncate">
                                {localizeText(rec.gem.name, locale)}
                              </div>
                              <div className="text-[10px] text-zinc-400 truncate">
                                {rec.gem.stats.slice(0, 1).map((s) => localizeStatLine(s, locale)).join('')}
                              </div>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-emerald-400 shrink-0">
                              +{rec.dpsDeltaPct.toFixed(1)}%
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
