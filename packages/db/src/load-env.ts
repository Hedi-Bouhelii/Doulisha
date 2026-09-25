import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Walks up from the working directory to the monorepo root. */
function findRepoRoot(start = process.cwd()): string | undefined {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/**
 * Loads the root .env.local written by `neon link` when running scripts locally
 * (migrations, seed, drizzle-kit). In CI and on Vercel the variables come from
 * the platform, and variables already set are never overwritten.
 */
export function loadRootEnv(): void {
  const root = findRepoRoot();
  const file = root && join(root, '.env.local');
  if (file && existsSync(file)) process.loadEnvFile(file);
}

export function requireEnv(name: 'DATABASE_URL' | 'DATABASE_URL_UNPOOLED'): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Run \`neon link\` (see README).`);
  if (/\/neondb\?/.test(value)) {
    throw new Error(
      `${name} points at the default "neondb" database. Run \`pnpm db:use-doulisha\`.`,
    );
  }
  return value;
}
