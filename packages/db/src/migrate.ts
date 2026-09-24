// Applies committed SQL migrations. Never use `drizzle-kit push` (CLAUDE.md).
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/neon-serverless/migrator';

import { createPoolDb } from './client';
import { loadRootEnv, requireEnv } from './load-env';

loadRootEnv();
const { db, pool } = createPoolDb(requireEnv('DATABASE_URL_UNPOOLED'));

try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
  console.warn(`Migrations applied (branch: ${process.env.NEON_BRANCH ?? 'unknown'}).`);
} finally {
  await pool.end();
}
