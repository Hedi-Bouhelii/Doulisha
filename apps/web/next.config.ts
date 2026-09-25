import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import './src/load-root-env';
import { getServerEnv } from './src/env';

// Fail fast on a bad configuration, except where secrets are deliberately
// absent (CI builds set SKIP_ENV_VALIDATION=1).
if (!process.env.SKIP_ENV_VALIDATION) getServerEnv();

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Internal packages ship TypeScript source; Next compiles them (ADR 0001).
  transpilePackages: [
    '@doulisha/api',
    '@doulisha/auth',
    '@doulisha/db',
    '@doulisha/i18n',
    '@doulisha/notifications',
    '@doulisha/payments',
    '@doulisha/storage',
    '@doulisha/templates',
    '@doulisha/ui-tokens',
    '@doulisha/validators',
  ],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
