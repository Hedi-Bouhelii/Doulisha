import type en from '@doulisha/i18n/messages/en.json';

import type { routing } from './src/i18n/routing';

declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof en;
  }
}
