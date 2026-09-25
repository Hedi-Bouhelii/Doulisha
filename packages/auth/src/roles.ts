import type { Executor } from '@doulisha/db';
import { schema } from '@doulisha/db';
import { eq } from 'drizzle-orm';

export type UserRole = (typeof schema.userRole.enumValues)[number];

/**
 * Roles held by a user (ACC-05). Everyone is a participant, whether or not the
 * row exists, so the list always contains `participant`.
 */
export async function getUserRoles(db: Executor, userId: string): Promise<UserRole[]> {
  const rows = await db
    .select({ role: schema.userRoles.role })
    .from(schema.userRoles)
    .where(eq(schema.userRoles.userId, userId));
  const roles = new Set<UserRole>(['participant', ...rows.map((r) => r.role)]);
  return [...roles];
}

export async function grantRole(db: Executor, userId: string, role: UserRole): Promise<void> {
  await db.insert(schema.userRoles).values({ userId, role }).onConflictDoNothing();
}
