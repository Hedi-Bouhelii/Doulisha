/**
 * Copies the template definitions and names from code (@doulisha/templates)
 * into the database, for templates that already exist, and bumps their version.
 * Use after changing a template in code, without wiping the data like the seed.
 * Admin edits made in /admin/templates are overwritten.
 *
 * Usage: pnpm db:sync-templates [--force]  (refuses production without --force)
 */
import { templateDefinitions } from '@doulisha/templates';
import { eq, sql } from 'drizzle-orm';

import { createPoolDb } from './client';
import { loadRootEnv, requireEnv } from './load-env';
import * as s from './schema';

loadRootEnv();

if (process.env.NEON_BRANCH === 'production' && !process.argv.includes('--force')) {
  console.error(
    'Refusing to sync templates on the production branch. Pass --force if you mean it.',
  );
  process.exit(1);
}

const { db, pool } = createPoolDb(requireEnv('DATABASE_URL_UNPOOLED'));
let updated = 0;
for (const template of templateDefinitions) {
  const rows = await db
    .update(s.templates)
    .set({
      name: template.name,
      definition: template.definition,
      version: sql`${s.templates.version} + 1`,
    })
    .where(eq(s.templates.key, template.key))
    .returning({ key: s.templates.key });
  updated += rows.length;
}
console.warn(`Templates synced: ${updated} (branch: ${process.env.NEON_BRANCH ?? 'unknown'}).`);
await pool.end();
