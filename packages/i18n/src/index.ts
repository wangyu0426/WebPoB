import type { LocalizedText, Locale } from '@webpob/core';
import { toTraditionalZh } from './traditional.js';

export * from './messages.js';
export * from './normalizer.js';
export * from './traditional.js';

export function isChineseLocale(locale: Locale): boolean {
  return locale === 'zh-CN' || locale === 'zh-TW';
}

export function localizeText(text: LocalizedText, locale: Locale): string {
  if (locale === 'en') return text.en;
  if (locale === 'zh-TW') {
    if (text.zhTw && text.zhTw.trim()) return text.zhTw;
    if (text.zh && text.zh.trim()) return toTraditionalZh(text.zh);
    return text.en;
  }
  return text.zh || text.en;
}

/**
 * Picks UI copy for the active locale. When `zhTw` is omitted, converts `zhCn`
 * into idiomatic PoE Traditional Chinese automatically.
 */
export function uiText(locale: Locale, zhCn: string, en: string, zhTw?: string): string {
  if (locale === 'en') return en;
  if (locale === 'zh-TW') return zhTw ?? toTraditionalZh(zhCn);
  return zhCn;
}
