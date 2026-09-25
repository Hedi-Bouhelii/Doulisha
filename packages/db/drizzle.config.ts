import { defineConfig } from 'drizzle-kit';

import { loadRootEnv } from './src/load-env';

loadRootEnv();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  casing: 'snake_case',
  // Direct (unpooled) connection for schema work.
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? '' },
  strict: true,
  verbose: true,
});
