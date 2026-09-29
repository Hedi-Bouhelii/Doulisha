/**
 * Runs on every Vercel build (ADR 0020). On a production deployment it applies
 * the committed migrations, then adds any missing categories and templates.
 * Everywhere else (local builds, CI, preview deployments) it does nothing, so
 * production is still never migrated by hand (CLAUDE.md).
 *
 * Usage: pnpm --filter @doulisha/db db:deploy
 */
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/neon-serverless/migrator';

import { createPoolDb } from './client';
import { loadRootEnv, requireEnv } from './load-env';
import { ensureReferenceData } from './reference-data';

if (process.env.VERCEL_ENV !== 'production') {
  console.warn('db:deploy skipped: not a Vercel production deployment.');
  process.exit(0);
}

loadRootEnv();
const { db, pool } = createPoolDb(requireEnv('DATABASE_URL_UNPOOLED'));
const branch = process.env.NEON_BRANCH ?? 'unknown';

try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
  const added = await ensureReferenceData(db);
  console.warn(
    `db:deploy: migrations applied, reference data added (${added.categories} categories, ${added.templates} templates) on branch ${branch}.`,
  );
} finally {
  await pool.end();
}
