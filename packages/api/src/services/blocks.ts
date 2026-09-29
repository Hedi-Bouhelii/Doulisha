import type { Executor } from '@doulisha/db';
import { schema } from '@doulisha/db';
import { and, desc, eq, inArray, or } from 'drizzle-orm';

import { AppError } from '../errors';
import type { Actor } from '../permissions';

const b = schema.blocks;

/**
 * TRS-03 block: the member no longer sees the other person's posts, comments
 * and messages, and that person can no longer write to them (ADR 0022).
 */
export async function blockUser(db: Executor, actor: Actor, userId: string) {
  if (userId === actor.userId) throw new AppError('BAD_REQUEST', 'errors.cannotBlockSelf');
  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  if (!user) throw new AppError('NOT_FOUND', 'errors.notFound');
  await db.insert(b).values({ blockerId: actor.userId, blockedId: userId }).onConflictDoNothing();
}

export async function unblockUser(db: Executor, actor: Actor, userId: string) {
  await db.delete(b).where(and(eq(b.blockerId, actor.userId), eq(b.blockedId, userId)));
}

/** People the member blocked, latest first ("My account"). */
export async function listBlocked(db: Executor, actor: Actor) {
  return db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      image: schema.users.image,
      since: b.createdAt,
    })
    .from(b)
    .innerJoin(schema.users, eq(schema.users.id, b.blockedId))
    .where(eq(b.blockerId, actor.userId))
    .orderBy(desc(b.createdAt));
}

/** Ids the viewer blocked: their content is hidden from the viewer. */
export async function blockedIds(db: Executor, viewerId: string | null): Promise<Set<string>> {
  if (!viewerId) return new Set();
  const rows = await db.select({ id: b.blockedId }).from(b).where(eq(b.blockerId, viewerId));
  return new Set(rows.map((r) => r.id));
}

/** Whether any of `blockers` blocked `userId` (they may not write to each other). */
export async function isBlockedBy(db: Executor, blockers: string[], userId: string) {
  const ids = blockers.filter(Boolean);
  if (ids.length === 0) return false;
  const [row] = await db
    .select({ id: b.blockerId })
    .from(b)
    .where(and(inArray(b.blockerId, ids), eq(b.blockedId, userId)))
    .limit(1);
  return Boolean(row);
}

/** Whether two people blocked each other in either direction. */
export async function blockedEitherWay(db: Executor, a: string, c: string) {
  const [row] = await db
    .select({ id: b.blockerId })
    .from(b)
    .where(
      or(and(eq(b.blockerId, a), eq(b.blockedId, c)), and(eq(b.blockerId, c), eq(b.blockedId, a))),
    )
    .limit(1);
  return Boolean(row);
}
