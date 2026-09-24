import 'server-only';

import { createHttpDb, type HttpDb } from '@doulisha/db';

import { getServerEnv } from '@/env';

let db: HttpDb | undefined;

/** Neon HTTP driver, created on first use (ADR 0002, docs/DATABASE.md). */
export function getDb(): HttpDb {
  db ??= createHttpDb(getServerEnv().DATABASE_URL);
  return db;
}
