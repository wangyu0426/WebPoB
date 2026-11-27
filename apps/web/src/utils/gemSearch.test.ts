import { describe, expect, it } from 'vitest';
import type { GemDefinition } from '@webpob/core';
import { getGemsForGame } from '@webpob/data';
import { searchGemsCatalog } from './gemSearch';

function makeGem(
  id: string,
  en: string,
  zh: string,
  category: 'active' | 'support' = 'active',
  tags: string[] = ['spell'],
): GemDefinition {
  return {
    id,
    game: 'poe2',
    category,
    color: 'blue',
    name: { en, zh },
    tags,
    modFlags: 0,
    keywordFlags: 0,
    stats: [],
  };
}

describe('searchGemsCatalog', () => {
  it('finds active gems beyond index 120 without truncation loss', () => {
    const synthetic: GemDefinition[] = [];
    for (let i = 0; i < 200; i++) {
      synthetic.push(makeGem(`gem_${i}`, `Alpha Skill ${i}`, `测试技能${i}`, 'active'));
    }
    synthetic.push(makeGem('comet', 'Comet', '彗星', 'active', ['spell', 'cold']));

    const res = searchGemsCatalog(synthetic, '彗星', { category: 'active', locale: 'zh-CN' });
    expect(res.items.map((g) => g.id)).toEqual(['comet']);
    expect(res.totalActive).toBe(1);
    expect(res.totalSupport).toBe(0);
  });

  it('ranks exact and prefix matches above substring matches in both ZH and EN', () => {
    const list = [
      makeGem('super_spark', 'Super Spark Wave', '超级电球波', 'active', ['spell', 'lightning']),
      makeGem('spark_nova', 'Spark Nova', '电球新星', 'active', ['spell', 'lightning']),
      makeGem('spark', 'Spark', '电球', 'active', ['spell', 'lightning']),
    ];

    const zh = searchGemsCatalog(list, '电球', { locale: 'zh-CN' });
    expect(zh.items.map((g) => g.id)).toEqual(['spark', 'spark_nova', 'super_spark']);

    const en = searchGemsCatalog(list, 'spark', { locale: 'en' });
    expect(en.items.map((g) => g.id)).toEqual(['spark', 'spark_nova', 'super_spark']);
  });

  it('supports multi-token and Chinese tag alias queries', () => {
    const list = [
      makeGem('fireball', 'Fireball', '火球', 'active', ['spell', 'fire', 'projectile']),
      makeGem('ice_nova', 'Ice Nova', '冰霜新星', 'active', ['spell', 'cold', 'area']),
      makeGem('added_fire', 'Added Fire Damage Support', '附加火焰伤害辅助', 'support', ['fire', 'support']),
    ];

    const fireSpell = searchGemsCatalog(list, '火焰 法术', { locale: 'zh-CN' });
    expect(fireSpell.items.map((g) => g.id)).toEqual(['fireball']);

    const fireAll = searchGemsCatalog(list, '火焰', { category: 'all', locale: 'zh-CN' });
    expect(fireAll.totalActive).toBe(1);
    expect(fireAll.totalSupport).toBe(1);

    const fireSupportOnly = searchGemsCatalog(list, '火焰', { category: 'support', locale: 'zh-CN' });
    expect(fireSupportOnly.items.map((g) => g.id)).toEqual(['added_fire']);
  });

  it('searches real PoE 1 and PoE 2 gem catalogs cleanly', () => {
    const poe1 = getGemsForGame('poe1');
    const poe2 = getGemsForGame('poe2');
    expect(poe1.length).toBeGreaterThan(0);
    expect(poe2.length).toBeGreaterThan(0);

    const poe1Active = searchGemsCatalog(poe1, '', { category: 'active', locale: 'zh-CN' });
    expect(poe1Active.totalActive).toBeGreaterThan(0);
    expect(poe1Active.items.every((g) => g.category === 'active')).toBe(true);

    const poe2Active = searchGemsCatalog(poe2, '', { category: 'active', locale: 'en' });
    expect(poe2Active.totalActive).toBeGreaterThan(0);
    expect(poe2Active.items.every((g) => g.category === 'active')).toBe(true);
  });
});
