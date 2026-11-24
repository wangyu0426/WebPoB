import { useMemo, useState } from 'react';
import { ClipboardPaste, ExternalLink, Search, Shield, Sparkles, X } from 'lucide-react';
import type { EquipmentSlotId, Item } from '@webpob/core';
import {
  getPresetItemsForGame,
  getRuleset,
  getUniquesForGame,
  instantiateUniqueItem,
  type CompactUniqueEntry,
} from '@webpob/data';
import { parseItemText } from '@webpob/codec';
import { resolveItemEffectiveStats } from '@webpob/calc';
import { getSlotLabel, localizeStatLine, t } from '@webpob/i18n';
import { useWebPobStore } from '../store/useWebPobStore';

const EXAMPLE_EN_ITEM = `Item Class: Body Armours
Rarity: Rare
Storm Shroud
Vaal Regalia
--------
Quality: +20% (augmented)
Energy Shield: 620 (augmented)
--------
+95 to maximum Life
+44% to Fire Resistance
+42% to Lightning Resistance
32% increased Spell Damage`;

const EXAMPLE_ZH_ITEM = `物品类别: 胸甲
稀有度: 稀有
风暴帷幕
瓦尔法衣
--------
品质: +20%（已增强）
能量护盾: 620（已增强）
--------
最大生命 +95
火焰抗性 +44%
闪电抗性 +42%
法术伤害提高 32%`;

const RARITY_COLOR: Record<Item['rarity'], string> = {
  NORMAL: 'text-zinc-200 border-zinc-600/50',
  MAGIC: 'text-blue-300 border-blue-500/40',
  RARE: 'text-yellow-200 border-yellow-500/40',
  UNIQUE: 'text-orange-400 border-orange-500/50',
};

const UNIQUE_SLOT_FILTERS = [
  'ALL',
  'Weapon 1',
  'Weapon 2',
  'Body Armour',
  'Helmet',
  'Gloves',
  'Boots',
  'Amulet',
  'Ring 1',
  'Belt',
  'Flask 1',
  'Jewel',
] as const;

function buildTradeSearchUrl(item: Item, game: 'poe1' | 'poe2', cn: boolean): string {
  const query = item.rarity === 'UNIQUE' ? { name: item.name, type: item.baseName } : { type: item.baseName };
  const payload = JSON.stringify({
    query: {
      status: { option: 'online' },
      ...query,
    },
    sort: { price: 'asc' },
  });
  const encoded = encodeURIComponent(payload);
  if (cn && game === 'poe1') {
    return `https://poe.game.qq.com/trade/search/Standard?q=${encoded}`;
  }
  return game === 'poe2'
    ? `https://www.pathofexile.com/trade2/search/poe2/Standard?q=${encoded}`
    : `https://www.pathofexile.com/trade/search/Standard?q=${encoded}`;
}

export function ItemsTab() {
  const {
    locale,
    build,
    treeRevision,
    addItem,
    equipItem,
    unequipSlot,
    toggleFlaskActive,
  } = useWebPobStore();
  const [pasteText, setPasteText] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlotId>('Weapon 1');
  const [uniqueSearch, setUniqueSearch] = useState('');
  const [uniqueSlotFilter, setUniqueSlotFilter] = useState<(typeof UNIQUE_SLOT_FILTERS)[number]>('ALL');

  const ruleset = getRuleset(build.game);
  const presets = getPresetItemsForGame(build.game);

  const officialUniques = useMemo(() => {
    void treeRevision;
    return getUniquesForGame(build.game);
  }, [build.game, treeRevision]);

  const filteredUniques = useMemo(() => {
    const q = uniqueSearch.trim().toLowerCase();
    const list: CompactUniqueEntry[] = [];
    for (const u of officialUniques) {
      if (uniqueSlotFilter !== 'ALL' && u.s !== uniqueSlotFilter) continue;
      if (q) {
        const hay = `${u.en} ${u.zh ?? ''} ${u.b} ${u.bz ?? ''} ${u.e.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      list.push(u);
      if (list.length >= 60) break;
    }
    return list;
  }, [officialUniques, uniqueSearch, uniqueSlotFilter]);

  const handleParse = (autoEquip: boolean) => {
    const parsed = parseItemText(pasteText, undefined, build.game);
    if (!parsed) {
      setStatusMsg({ ok: false, text: t(locale, 'items.parseError') });
      return;
    }
    const targetSlot =
      autoEquip
        ? parsed.slotType !== 'Any'
          ? parsed.slotType
          : selectedSlot
        : undefined;
    addItem(parsed, targetSlot);
    setStatusMsg({
      ok: true,
      text: `${t(locale, 'items.parseSuccess')} (${parsed.name} → ${
        targetSlot ? getSlotLabel(locale, targetSlot) : t(locale, 'items.stash')
      })`,
    });
    setPasteText('');
  };

  const handleEquipUnique = (entry: CompactUniqueEntry) => {
    const item = instantiateUniqueItem(build.game, entry, 20);
    if (entry.s === 'Jewel') {
      addItem(item);
      setStatusMsg({
        ok: true,
        text:
          locale === 'zh-CN'
            ? `已将传奇珠宝「${entry.zh ?? entry.en}」加入物品栏，可在天赋树点击珠宝插槽镶嵌`
            : `Added unique jewel "${entry.en}" to stash. Click any allocated Jewel Socket on the Tree to socket it.`,
      });
      return;
    }
    const targetSlot = (entry.s !== 'Any' ? entry.s : selectedSlot) as EquipmentSlotId;
    addItem(item, targetSlot);
    equipItem(targetSlot, item.id);
    if (targetSlot.startsWith('Flask ') && !build.activeFlaskSlots?.[targetSlot]) {
      toggleFlaskActive(targetSlot);
    }
    setSelectedSlot(targetSlot);
  };

  const displayName = (item: Item) =>
    locale === 'zh-CN' && item.nameZh ? item.nameZh : item.name;
  const displayBase = (item: Item) =>
    locale === 'zh-CN' && item.baseNameZh ? item.baseNameZh : item.baseName;

  const equippedItem = build.equipped[selectedSlot]
    ? build.items[build.equipped[selectedSlot]!]
    : undefined;

  const resolvedEquipped = useMemo(
    () => (equippedItem ? resolveItemEffectiveStats(equippedItem, build.game) : undefined),
    [equippedItem, build.game],
  );

  return (
    <div className="h-full overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left: Equipment Slots */}
      <div className="lg:col-span-5 space-y-2.5">
        <h2 className="text-base font-bold text-amber-200">{t(locale, 'items.title')}</h2>
        <div className="space-y-1.5">
          {ruleset.equipmentSlots.map((slot) => {
            const itemId = build.equipped[slot];
            const item = itemId ? build.items[itemId] : undefined;
            const isSelected = selectedSlot === slot;
            return (
              <div
                key={slot}
                onClick={() => setSelectedSlot(slot)}
                className={`pob-panel rounded-md px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition ${
                  isSelected ? 'ring-1 ring-amber-500/70 bg-[#191e2c]' : 'hover:bg-[#171b27]'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[11px] text-zinc-400">{getSlotLabel(locale, slot)}</div>
                  {item ? (
                    <div className={`text-xs font-semibold truncate ${RARITY_COLOR[item.rarity].split(' ')[0]}`}>
                      {displayName(item)}{' '}
                      <span className="text-zinc-400 font-normal">({displayBase(item)})</span>
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500 italic">{t(locale, 'items.empty')}</div>
                  )}
                </div>
                {item && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {slot.startsWith('Flask ') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFlaskActive(slot);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer transition ${
                          build.activeFlaskSlots?.[slot]
                            ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
                            : 'bg-zinc-900/60 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {build.activeFlaskSlots?.[slot]
                          ? locale === 'zh-CN'
                            ? '已启用'
                            : 'Active'
                          : locale === 'zh-CN'
                            ? '未启用'
                            : 'Off'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        unequipSlot(slot);
                      }}
                      className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                      title={t(locale, 'items.unequip')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Inspector + Unique Browser + Bilingual Clipboard Parser + Preset Library */}
      <div className="lg:col-span-7 space-y-4">
        {/* Selected Slot Item Tooltip Card */}
        <div className="pob-panel rounded-lg p-4">
          <div className="flex items-center justify-between border-b border-[#252b3d] pb-2 mb-3 gap-2">
            <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              {getSlotLabel(locale, selectedSlot)}
            </span>
            {equippedItem && (
              <div className="flex items-center gap-2">
                <a
                  href={buildTradeSearchUrl(equippedItem, build.game, locale === 'zh-CN')}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/35"
                >
                  <ExternalLink className="w-3 h-3" />
                  {locale === 'zh-CN' ? '市集搜索' : 'Trade'}
                </a>
                <span className="text-[11px] font-mono text-zinc-400">
                  Q{equippedItem.quality}%
                </span>
              </div>
            )}
          </div>

          {equippedItem ? (
            <div className={`rounded border p-3 bg-[#0b0d14] space-y-2 ${RARITY_COLOR[equippedItem.rarity]}`}>
              <div>
                <div className="text-sm font-bold">{displayName(equippedItem)}</div>
                <div className="text-xs text-zinc-400">{displayBase(equippedItem)}</div>
              </div>
              {(resolvedEquipped?.armourStats || resolvedEquipped?.weaponStats) && (
                <div className="text-xs text-zinc-300 border-t border-[#232838] pt-2 flex flex-wrap gap-3 font-mono">
                  {resolvedEquipped.armourStats?.armour && <span>Armour: {resolvedEquipped.armourStats.armour}</span>}
                  {resolvedEquipped.armourStats?.evasion && <span>Evasion: {resolvedEquipped.armourStats.evasion}</span>}
                  {resolvedEquipped.armourStats?.energyShield && <span className="text-sky-300">ES: {resolvedEquipped.armourStats.energyShield}</span>}
                  {resolvedEquipped.armourStats?.blockChance && <span>Block: {resolvedEquipped.armourStats.blockChance}%</span>}
                  {resolvedEquipped.weaponStats && (
                    <>
                      <span>Phys: {resolvedEquipped.weaponStats.physicalMin}-{resolvedEquipped.weaponStats.physicalMax}</span>
                      <span>APS: {resolvedEquipped.weaponStats.attacksPerSecond}</span>
                      <span>Crit: {resolvedEquipped.weaponStats.critChance}%</span>
                    </>
                  )}
                </div>
              )}
              {equippedItem.implicits.length > 0 && (
                <div className="border-t border-[#232838] pt-2 space-y-0.5 text-xs text-sky-300">
                  {equippedItem.implicits.map((line, i) => (
                    <div key={i}>{localizeStatLine(line, locale)}</div>
                  ))}
                </div>
              )}
              <div className="border-t border-[#232838] pt-2 space-y-0.5 text-xs text-indigo-200">
                {equippedItem.explicits.map((line, i) => (
                  <div key={i}>{localizeStatLine(line, locale)}</div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-zinc-500 py-4 text-center">{t(locale, 'items.empty')}</div>
          )}
        </div>

        {/* Official Bilingual Unique Item Browser (1,304 PoE 1 / 427 PoE 2 Uniques) */}
        <div className="pob-panel rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              {locale === 'zh-CN'
                ? `官方传奇暗金库 (${officialUniques.length} 件)`
                : `Official Unique Database (${officialUniques.length} items)`}
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={uniqueSearch}
                  onChange={(e) => setUniqueSearch(e.target.value)}
                  placeholder={locale === 'zh-CN' ? '搜暗金名/词缀 (如 猎首 / 薛朗)...' : 'Search unique or mod...'}
                  className="pob-input rounded pl-7 pr-2 py-1 text-xs w-52"
                />
              </div>
              <select
                value={uniqueSlotFilter}
                onChange={(e) => setUniqueSlotFilter(e.target.value as (typeof UNIQUE_SLOT_FILTERS)[number])}
                className="pob-input rounded px-2 py-1 text-xs"
              >
                {UNIQUE_SLOT_FILTERS.map((sf) => (
                  <option key={sf} value={sf}>
                    {sf === 'ALL'
                      ? locale === 'zh-CN'
                        ? '全部部位'
                        : 'All Slots'
                      : sf === 'Jewel'
                        ? locale === 'zh-CN'
                          ? '珠宝'
                          : 'Jewel'
                        : getSlotLabel(locale, sf)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2 pr-1">
            {filteredUniques.map((u) => (
              <div
                key={`${u.en}_${u.b}`}
                className="rounded bg-[#0c0e15] border border-orange-500/25 hover:border-orange-400/50 p-2.5 flex flex-col justify-between gap-1.5 text-xs transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-orange-300 truncate">
                      {locale === 'zh-CN' && u.zh ? u.zh : u.en}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      {locale === 'zh-CN' && u.bz ? `${u.bz} (${u.en})` : u.b} ·{' '}
                      {u.s === 'Jewel'
                        ? locale === 'zh-CN'
                          ? '珠宝'
                          : 'Jewel'
                        : getSlotLabel(locale, u.s as EquipmentSlotId)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEquipUnique(u)}
                    className="px-2 py-0.5 rounded text-[11px] bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 border border-orange-500/40 shrink-0 cursor-pointer"
                  >
                    {u.s === 'Jewel'
                      ? locale === 'zh-CN'
                        ? '添加'
                        : 'Add'
                      : t(locale, 'items.equip')}
                  </button>
                </div>
                {u.e.length > 0 && (
                  <div className="text-[10px] text-indigo-200/80 line-clamp-2 leading-tight">
                    {u.e.slice(0, 2).map((line) => localizeStatLine(line, locale)).join(' · ')}
                  </div>
                )}
              </div>
            ))}
            {filteredUniques.length === 0 && (
              <div className="col-span-2 text-center text-xs text-zinc-500 py-4">
                {locale === 'zh-CN' ? '未找到匹配的传奇装备' : 'No matching unique items found'}
              </div>
            )}
          </div>
        </div>

        {/* Bilingual Ctrl+C Item Text Parser */}
        <div className="pob-panel rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
              <ClipboardPaste className="w-4 h-4" />
              {t(locale, 'items.pasteTitle')}
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPasteText(EXAMPLE_ZH_ITEM)}
                className="px-2 py-1 rounded text-[11px] bg-[#1a1f2e] hover:bg-[#232a3e] text-amber-200 border border-[#2c3348] cursor-pointer"
              >
                {t(locale, 'items.loadExampleZh')}
              </button>
              <button
                type="button"
                onClick={() => setPasteText(EXAMPLE_EN_ITEM)}
                className="px-2 py-1 rounded text-[11px] bg-[#1a1f2e] hover:bg-[#232a3e] text-sky-200 border border-[#2c3348] cursor-pointer"
              >
                {t(locale, 'items.loadExampleEn')}
              </button>
            </div>
          </div>

          <textarea
            rows={5}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={t(locale, 'items.pastePlaceholder')}
            className="pob-input w-full rounded p-2.5 text-xs font-mono"
          />

          <div className="flex items-center justify-between gap-2">
            <div className="text-xs">
              {statusMsg && (
                <span className={statusMsg.ok ? 'text-emerald-400' : 'text-rose-400'}>
                  {statusMsg.text}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleParse(false)}
                className="px-3 py-1.5 rounded text-xs bg-[#1b2030] hover:bg-[#252c40] text-zinc-200 border border-[#2e364d] cursor-pointer"
              >
                {t(locale, 'items.parseOnly')}
              </button>
              <button
                type="button"
                onClick={() => handleParse(true)}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-500/50 cursor-pointer"
              >
                {t(locale, 'items.parseAndEquip')}
              </button>
            </div>
          </div>
        </div>

        {/* Starter Preset Library */}
        <div className="pob-panel rounded-lg p-4 space-y-2.5">
          <h3 className="text-xs font-bold text-amber-200">{t(locale, 'items.presetLibrary')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {presets.map((item) => (
              <div
                key={item.id}
                className="rounded bg-[#0c0e15] border border-[#22283a] p-2.5 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className={`font-semibold truncate ${RARITY_COLOR[item.rarity].split(' ')[0]}`}>
                    {displayName(item)}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {displayBase(item)} · {item.slotType !== 'Any' ? getSlotLabel(locale, item.slotType) : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const slot = item.slotType !== 'Any' ? item.slotType : selectedSlot;
                    addItem(item, slot);
                    equipItem(slot, item.id);
                  }}
                  className="px-2 py-1 rounded text-[11px] bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/35 shrink-0 cursor-pointer"
                >
                  {t(locale, 'items.equip')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
