import { randomInt } from 'node:crypto';

/** Tunisia is UTC+1 all year (no daylight saving). */
const TUNIS_OFFSET_HOURS = 1;

/**
 * A date `days` from `base`, at `time` (HH:MM) Tunisia time.
 * Seed dates are relative so the demo never shows only past events.
 */
export function tunisDate(base: Date, days: number, time: string): Date {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const date = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + days, hours, minutes),
  );
  date.setUTCHours(date.getUTCHours() - TUNIS_OFFSET_HOURS);
  return date;
}

/** The next occurrence of a weekday (0 = Sunday … 6 = Saturday), at least `minDays` ahead. */
export function nextWeekday(base: Date, weekday: number, minDays = 1): number {
  for (let days = minDays; days < minDays + 7; days++) {
    const d = new Date(base.getTime() + days * 86_400_000);
    if (d.getUTCDay() === weekday) return days;
  }
  return minDays;
}

// No 0/O or 1/I/L, so references can be read out on the phone.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function randomCode(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export const orderReference = () => `DLS-${randomCode(6)}`;
export const ticketCode = () => randomCode(12);

/** Dinars to millimes (1 TND = 1000 millimes). */
export const dt = (dinars: number) => Math.round(dinars * 1000);
