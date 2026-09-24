/**
 * @doulisha/i18n: locales, messages (ar, fr, en) and formatters (TND, Africa/Tunis dates).
 * Framework-free so the future mobile app can reuse it (ADR 0006).
 */
export * from './format';
export * from './locales';

/** Text written in the three interface languages (categories, templates). */
export interface LocalizedText {
  ar: string;
  fr: string;
  en: string;
}
