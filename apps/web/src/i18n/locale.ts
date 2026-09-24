import type { Locale } from '@doulisha/i18n';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';

import { routing } from './routing';

/**
 * Reads the `[locale]` route parameter and rejects unknown values with a 404.
 * next-intl itself reads the locale from `next/root-params` (see request.ts).
 */
export async function resolveLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return locale;
}
