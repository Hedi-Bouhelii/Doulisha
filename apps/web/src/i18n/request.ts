import { TIME_ZONE } from '@doulisha/i18n';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { locale as rootLocale } from 'next/root-params';

import { routing } from './routing';

const loaders = {
  ar: () => import('@doulisha/i18n/messages/ar.json'),
  fr: () => import('@doulisha/i18n/messages/fr.json'),
  en: () => import('@doulisha/i18n/messages/en.json'),
};

/** Reads the `[locale]` root segment; unavailable outside page rendering. */
async function localeFromRoute(): Promise<string | undefined> {
  try {
    return await rootLocale();
  } catch {
    return undefined;
  }
}

/**
 * Locale for next-intl on the server, in order: an explicit locale
 * (`getTranslations({ locale })`), the `[locale]` route segment (Next 16
 * `next/root-params`), then the header set by the proxy.
 */
export default getRequestConfig(async ({ locale, requestLocale }) => {
  const requested = locale ?? (await localeFromRoute()) ?? (await requestLocale);
  const resolved = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale: resolved,
    messages: (await loaders[resolved]()).default,
    timeZone: TIME_ZONE,
  };
});
