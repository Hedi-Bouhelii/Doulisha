import { defaultLocale, locales } from '@doulisha/i18n';
import { defineRouting } from 'next-intl/routing';

/** Every page lives under /ar, /fr or /en (ADR 0008). */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
});
