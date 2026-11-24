import type { LocalizedText, Locale } from '@webpob/core';

export * from './messages.js';
export * from './normalizer.js';

export function localizeText(text: LocalizedText, locale: Locale): string {
  return locale === 'zh-CN' ? text.zh : text.en;
}
