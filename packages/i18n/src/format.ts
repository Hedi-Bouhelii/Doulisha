import type { Locale } from './locales';

/** Every date is shown in Tunisia's time zone, whatever the viewer's device says. */
export const TIME_ZONE = 'Africa/Tunis';

/** BCP 47 tags used with Intl. Tunisia writes numbers with Latin digits, in Arabic too. */
const intlLocale: Record<Locale, string> = {
  ar: 'ar-TN-u-nu-latn',
  fr: 'fr-TN',
  en: 'en-GB',
};

const currencySuffix: Record<Locale, string> = { ar: 'د.ت', fr: 'DT', en: 'DT' };

export const MILLIMES_PER_DINAR = 1000;

const NBSP = '\u00a0';

/** 45 DT → 45000 millimes. Rounds to the nearest millime. */
export function dinarsToMillimes(dinars: number): number {
  return Math.round(dinars * MILLIMES_PER_DINAR);
}

/**
 * Formats an amount stored in millimes, e.g. 45000 → "45 DT", 12500 → "12,5 DT" (fr),
 * "45 د.ت" (ar). Up to three decimals, as the dinar has 1000 millimes.
 */
export function formatPrice(millimes: number, locale: Locale): string {
  if (!Number.isInteger(millimes)) throw new RangeError('Amounts must be integer millimes');
  const number = new Intl.NumberFormat(intlLocale[locale], {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(millimes / MILLIMES_PER_DINAR);
  // A no-break space keeps the amount and the currency on one line.
  return `${number}${NBSP}${currencySuffix[locale]}`;
}

function dateFormat(locale: Locale, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: TIME_ZONE,
    hourCycle: 'h23',
    ...options,
  });
}

/** "sam. 26 avr. · 07:00" — used on event cards. */
export function formatEventDateTime(date: Date, locale: Locale): string {
  const day = dateFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
  return `${day} · ${formatTime(date, locale)}`;
}

/** "26 avril 2026" */
export function formatDate(date: Date, locale: Locale): string {
  return dateFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

/** "07:00" in Tunisia time. */
export function formatTime(date: Date, locale: Locale): string {
  return dateFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
}

/** Formats an integer with the locale's grouping, e.g. "1 245" (fr). */
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale[locale]).format(value);
}
