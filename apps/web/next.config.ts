import type { NextConfig } from 'next';

// Validate environment variables at build and start time.
import './src/env';

const nextConfig: NextConfig = {
  // Internal packages ship TypeScript source; Next compiles them.
  transpilePackages: ['@doulisha/i18n'],
};

export default nextConfig;
