import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * `neon link` writes the database variables to the monorepo root .env.local.
 * Next.js only reads env files next to the app, so load the root one too.
 * Node's loader never overwrites variables that are already set (Vercel, CI).
 */
const rootEnv = resolve(process.cwd(), '../../.env.local');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
