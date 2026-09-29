import type { Executor } from '@doulisha/db';
import { schema } from '@doulisha/db';
import type { completeSignUpSchema } from '@doulisha/validators';
import { and, eq } from 'drizzle-orm';
import type { z } from 'zod';

import { AppError } from '../errors';
import type { Actor } from '../permissions';
import { ensureProfileFromAccount } from './organizers';

/** Sets the password through Better Auth (hashing, credential account). */
export type SetPassword = (password: string) => Promise<void>;

export async function hasPassword(db: Executor, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(and(eq(schema.accounts.userId, userId), eq(schema.accounts.providerId, 'credential')))
    .limit(1);
  return Boolean(row);
}

/**
 * What the account still needs (ADR 0016): accounts created from a code have
 * a temporary name (the phone number or the email) and no password until the
 * member finishes sign-up.
 */
export async function accountStatus(db: Executor, actor: Actor) {
  const [user] = await db
    .select({
      name: schema.users.name,
      email: schema.users.email,
      phoneNumber: schema.users.phoneNumber,
      city: schema.profiles.city,
    })
    .from(schema.users)
    .leftJoin(schema.profiles, eq(schema.profiles.userId, schema.users.id))
    .where(eq(schema.users.id, actor.userId));
  if (!user) throw new AppError('NOT_FOUND', 'errors.notFound');
  const temporaryName =
    !user.name.trim() || user.name === user.phoneNumber || user.name === user.email.split('@')[0];
  const passwordSet = await hasPassword(db, actor.userId);
  return {
    name: temporaryName ? '' : user.name,
    city: user.city,
    hasPassword: passwordSet,
    isOrganizer: actor.roles.includes('organizer'),
    needsSetup: temporaryName || !passwordSet,
  };
}

/**
 * Last step of sign-up: name, city, password, and participant or organizer.
 * Organizers get their profile at once, prefilled from the account.
 */
export async function completeSignUp(
  db: Executor,
  actor: Actor,
  setPassword: SetPassword,
  input: z.infer<typeof completeSignUpSchema>,
) {
  await db.update(schema.users).set({ name: input.name }).where(eq(schema.users.id, actor.userId));
  await db
    .insert(schema.profiles)
    .values({ userId: actor.userId, city: input.city ?? null })
    .onConflictDoUpdate({ target: schema.profiles.userId, set: { city: input.city ?? null } });
  if (!(await hasPassword(db, actor.userId))) {
    if (!input.password) throw new AppError('BAD_REQUEST', 'errors.passwordRequired');
    await setPassword(input.password);
  }
  if (input.accountType === 'organizer') {
    const profile = await ensureProfileFromAccount(db, actor);
    return { organizerProfileId: profile.id };
  }
  return { organizerProfileId: null };
}

/** Existing accounts made before passwords (ADR 0016) add one once. */
export async function setFirstPassword(
  db: Executor,
  actor: Actor,
  setPassword: SetPassword,
  password: string,
) {
  if (await hasPassword(db, actor.userId)) {
    throw new AppError('BAD_REQUEST', 'errors.passwordAlreadySet');
  }
  await setPassword(password);
}
