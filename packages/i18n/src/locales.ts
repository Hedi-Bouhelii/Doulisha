/** Languages supported by Doulisha (specification section 8). */
export const locales = ['ar', 'fr', 'en'] as const;

export type Locale = (typeof locales)[number];

/**
 * Fallback when the user's language cannot be detected.
 * French is assumed until the founder confirms (docs/OPEN_QUESTIONS.md, Q4).
 */
export const defaultLocale: Locale = 'fr';

const rtlLocales: ReadonlySet<Locale> = new Set(['ar']);

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Text direction for a locale, used for the `dir` attribute and I18nManager. */
export function getDirection(locale: Locale): 'rtl' | 'ltr' {
  return rtlLocales.has(locale) ? 'rtl' : 'ltr';
}
