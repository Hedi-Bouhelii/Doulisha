import { neon, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePool } from 'drizzle-orm/neon-serverless';

import * as schema from './schema';

/** Column names are snake_case in Postgres and camelCase in TypeScript. */
const options = { schema, casing: 'snake_case' } as const;

/**
 * HTTP driver: one round trip per query, no connection to keep.
 * Use it for simple reads and single writes.
 */
export function createHttpDb(url: string) {
  return drizzleHttp({ client: neon(url), ...options });
}

/**
 * WebSocket pool: supports interactive transactions (`db.transaction`) and
 * `SELECT … FOR UPDATE`. Use it for bookings, payments and stock (DATABASE.md).
 * Create it per request in serverless functions and close it with `pool.end()`.
 */
export function createPoolDb(url: string) {
  const pool = new Pool({ connectionString: url });
  return { db: drizzlePool({ client: pool, ...options }), pool };
}

export type HttpDb = ReturnType<typeof createHttpDb>;
export type PoolDb = ReturnType<typeof createPoolDb>['db'];
/** Either driver; services that only query accept both. */
export type Db = HttpDb | PoolDb;
