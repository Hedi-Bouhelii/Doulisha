import { z } from 'zod';

/** Interface languages (spec section 8). */
export const localeSchema = z.enum(['ar', 'fr', 'en']);

/** Any phone number in E.164 format, e.g. +33612345678. */
export const e164PhoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, 'Phone numbers must be in international format, e.g. +21620123456');

/**
 * Normalizes what people type (spaces, dashes, 00 or no prefix) to E.164.
 * Eight-digit numbers are treated as Tunisian (+216).
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (/^\d{8}$/.test(digits)) return `+216${digits}`;
  return `+${digits}`;
}

/** Phone input from a form: normalized, then validated as E.164. */
export const phoneInputSchema = z.string().transform(normalizePhone).pipe(e164PhoneSchema);

/** Money as integer millimes (1 TND = 1000 millimes). */
export const millimesSchema = z.number().int().nonnegative();

export const slugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, digits and dashes');

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().nullish(),
});
