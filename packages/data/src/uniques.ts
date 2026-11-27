import type { EquipmentSlotId, GameId, Item } from '@webpob/core';
import { getBaseItemStats } from './baseItems.js';
import { applyLocaleOverlayToUniques } from './localeOverlay.js';

export interface CompactUniqueEntry {
  en: string;
  zh?: string;
  zhTw?: string;
  b: string;
  bz?: string;
  bzTw?: string;
  s: string;
  i?: string[];
  e: string[];
}

export interface CompactUniquesPayload {
  game: GameId;
  count: number;
  uniques: CompactUniqueEntry[];
}

const registeredUniques: Record<GameId, CompactUniqueEntry[]> = {
  poe1: [],
  poe2: [],
};
const loadedUniquesFlag: Partial<Record<GameId, boolean>> = {};

export const OFFICIAL_UNIQUES_FILES: Record<GameId, string> = {
  poe1: 'poe1-uniques.json',
  poe2: 'poe2-uniques.json',
};

export function registerUniques(payload: CompactUniquesPayload): number {
  applyLocaleOverlayToUniques(payload.game, payload.uniques);
  registeredUniques[payload.game] = payload.uniques;
  loadedUniquesFlag[payload.game] = true;
  return payload.uniques.length;
}

export async function loadOfficialUniques(game: GameId, basePath = '/data'): Promise<number> {
  if (loadedUniquesFlag[game]) return registeredUniques[game].length;
  const url = `${basePath.replace(/\/+$/, '')}/${OFFICIAL_UNIQUES_FILES[game]}`;
  const res = await fetch(url);
  if (!res.ok) return 0;
  const payload = (await res.json()) as CompactUniquesPayload;
  return registerUniques(payload);
}

export function getUniquesForGame(game: GameId): CompactUniqueEntry[] {
  return registeredUniques[game];
}

/**
 * Instantiates a live WebPoB `Item` from a compact Unique catalog entry,
 * hydrating official base stats & local weapon/armour modifiers at Quality 20%.
 */
export function instantiateUniqueItem(
  game: GameId,
  entry: CompactUniqueEntry,
  quality = 20,
): Item {
  const slotType = (entry.s === 'Jewel' ? 'Any' : entry.s) as EquipmentSlotId | 'Any';
  const implicits = entry.i ?? [];
  const explicits = entry.e ?? [];
  const base = getBaseItemStats(entry.b, 0, game);

  return {
    id: `uniq_${game}_${entry.en.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`,
    name: entry.en,
    nameZh: entry.zh,
    nameZhTw: entry.zhTw,
    baseName: entry.b,
    baseNameZh: entry.bz,
    baseNameZhTw: entry.bzTw,
    rarity: 'UNIQUE',
    slotType,
    quality: slotType === 'Amulet' || slotType === 'Ring 1' || slotType === 'Belt' || slotType === 'Flask 1' || entry.s === 'Jewel' ? 0 : quality,
    armourStats: base?.armour ? { ...base.armour } : undefined,
    weaponStats: base?.weapon ? { ...base.weapon } : undefined,
    implicits,
    explicits,
    localStatsPrecomputed: false,
  };
}
