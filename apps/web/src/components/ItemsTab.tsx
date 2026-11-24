import { useState } from 'react';
import { ClipboardPaste, Shield, X } from 'lucide-react';
import type { EquipmentSlotId, Item } from '@webpob/core';
import { getPresetItemsForGame, getRuleset } from '@webpob/data';
import { parseItemText } from '@webpob/codec';
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

export function ItemsTab() {
  const { locale, build, addItem, equipItem, unequipSlot } = useWebPobStore();
  const [pasteText, setPasteText] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlotId>('Weapon 1');

  const ruleset = getRuleset(build.game);
  const presets = getPresetItemsForGame(build.game);

  const handleParse = (autoEquip: boolean) => {
    const parsed = parseItemText(pasteText);
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

  const displayName = (item: Item) =>
    locale === 'zh-CN' && item.nameZh ? item.nameZh : item.name;
  const displayBase = (item: Item) =>
    locale === 'zh-CN' && item.baseNameZh ? item.baseNameZh : item.baseName;

  const equippedItem = build.equipped[selectedSlot]
    ? build.items[build.equipped[selectedSlot]!]
    : undefined;

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
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Inspector + Bilingual Clipboard Parser + Preset Library */}
      <div className="lg:col-span-7 space-y-4">
        {/* Selected Slot Item Tooltip Card */}
        <div className="pob-panel rounded-lg p-4">
          <div className="flex items-center justify-between border-b border-[#252b3d] pb-2 mb-3">
            <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              {getSlotLabel(locale, selectedSlot)}
            </span>
            {equippedItem && (
              <span className="text-[11px] font-mono text-zinc-400">
                Q{equippedItem.quality}%
              </span>
            )}
          </div>

          {equippedItem ? (
            <div className={`rounded border p-3 bg-[#0b0d14] space-y-2 ${RARITY_COLOR[equippedItem.rarity]}`}>
              <div>
                <div className="text-sm font-bold">{displayName(equippedItem)}</div>
                <div className="text-xs text-zinc-400">{displayBase(equippedItem)}</div>
              </div>
              {(equippedItem.armourStats || equippedItem.weaponStats) && (
                <div className="text-xs text-zinc-300 border-t border-[#232838] pt-2 flex flex-wrap gap-3 font-mono">
                  {equippedItem.armourStats?.armour && <span>Armour: {equippedItem.armourStats.armour}</span>}
                  {equippedItem.armourStats?.evasion && <span>Evasion: {equippedItem.armourStats.evasion}</span>}
                  {equippedItem.armourStats?.energyShield && <span className="text-sky-300">ES: {equippedItem.armourStats.energyShield}</span>}
                  {equippedItem.armourStats?.blockChance && <span>Block: {equippedItem.armourStats.blockChance}%</span>}
                  {equippedItem.weaponStats && (
                    <>
                      <span>Phys: {equippedItem.weaponStats.physicalMin}-{equippedItem.weaponStats.physicalMax}</span>
                      <span>APS: {equippedItem.weaponStats.attacksPerSecond}</span>
                      <span>Crit: {equippedItem.weaponStats.critChance}%</span>
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
            rows={7}
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

        {/* Preset Library */}
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
