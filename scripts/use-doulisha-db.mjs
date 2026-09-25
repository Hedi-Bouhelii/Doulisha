// `neon link` and `neon checkout` write connection strings for the default
// `neondb` database. Doulisha's tables live in the `Doulisha` database, so this
// rewrites both URLs in the root .env.local. Usage: pnpm db:use-doulisha
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../.env.local', import.meta.url);
if (!existsSync(file)) {
  console.error('.env.local not found. Run `neon link` first (see README).');
  process.exit(1);
}
const before = readFileSync(file, 'utf8');
const after = before.replace(
  /^(DATABASE_URL(?:_UNPOOLED)?=.*?\.neon\.tech\/)neondb\?/gm,
  '$1Doulisha?',
);
writeFileSync(file, after);
console.warn(
  before === after
    ? 'Already using the Doulisha database.'
    : 'Switched .env.local to the Doulisha database.',
);
