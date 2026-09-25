import { neon, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePool } from 'drizzle-orm/neon-serverless';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';

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
/** A transaction opened with `PoolDb.transaction` (row locks, SELECT … FOR UPDATE). */
export type Tx = Parameters<Parameters<PoolDb['transaction']>[0]>[0];
/** Either driver; services that only query accept both. */
export type Db = HttpDb | PoolDb;
/**
 * Anything that can run queries: either driver or an open transaction.
 * Typed as Drizzle's common base class rather than a union, so query builder
 * overloads (e.g. `.returning({...})`) resolve normally.
 */
export type Executor = PgDatabase<
  PgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/**
 * Runs `fn` in a transaction on a fresh WebSocket pool and closes the pool
 * afterwards (the pattern Neon recommends for serverless functions).
 */
export async function withTransaction<T>(url: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const { db, pool } = createPoolDb(url);
  try {
    return await db.transaction(fn);
  } finally {
    await pool.end();
  }
}
