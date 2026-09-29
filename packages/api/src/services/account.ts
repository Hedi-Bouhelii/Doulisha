import type { Executor } from '@doulisha/db';
import { schema } from '@doulisha/db';
import { isPlaceholderEmail, type completeSignUpSchema } from '@doulisha/validators';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { z } from 'zod';

import {
  canRemoveProvider,
  SOCIAL_PROVIDERS,
  type SignInMethods,
  type SocialProvider,
} from '../domain/sign-in-methods';
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

/** Google, Facebook or Apple accounts connected to the member (ADR 0019). */
async function socialAccounts(db: Executor, userId: string) {
  return db
    .select({ providerId: schema.accounts.providerId, linkedAt: schema.accounts.createdAt })
    .from(schema.accounts)
    .where(
      and(
        eq(schema.accounts.userId, userId),
        inArray(schema.accounts.providerId, [...SOCIAL_PROVIDERS]),
      ),
    )
    .orderBy(asc(schema.accounts.createdAt));
}

/**
 * What the account still needs (ADR 0016, ADR 0019): accounts created from a
 * code have a temporary name (the phone number or the email) and no password
 * until the member finishes sign-up. Google or Facebook accounts need no
 * password: the provider is their way in.
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
  const [passwordSet, social] = await Promise.all([
    hasPassword(db, actor.userId),
    socialAccounts(db, actor.userId),
  ]);
  const hasSocial = social.length > 0;
  return {
    name: temporaryName ? '' : user.name,
    city: user.city,
    hasPassword: passwordSet,
    hasSocial,
    isOrganizer: actor.roles.includes('organizer'),
    needsSetup: temporaryName || (!passwordSet && !hasSocial),
  };
}

/**
 * Last step of sign-up: name, city, password (optional with Google or
 * Facebook), and participant or organizer.
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
    if (input.password) {
      await setPassword(input.password);
    } else if ((await socialAccounts(db, actor.userId)).length === 0) {
      throw new AppError('BAD_REQUEST', 'errors.passwordRequired');
    }
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

/** "Connected accounts" (ADR 0019): every way the member can sign in. */
export async function signInMethods(db: Executor, actor: Actor): Promise<SignInMethods> {
  const [user] = await db
    .select({
      email: schema.users.email,
      phoneNumber: schema.users.phoneNumber,
      phoneNumberVerified: schema.users.phoneNumberVerified,
    })
    .from(schema.users)
    .where(eq(schema.users.id, actor.userId));
  if (!user) throw new AppError('NOT_FOUND', 'errors.notFound');
  const [passwordSet, social] = await Promise.all([
    hasPassword(db, actor.userId),
    socialAccounts(db, actor.userId),
  ]);
  return {
    phone: user.phoneNumber && user.phoneNumberVerified ? user.phoneNumber : null,
    email: isPlaceholderEmail(user.email) ? null : user.email,
    hasPassword: passwordSet,
    providers: social.map((a) => ({
      providerId: a.providerId as SocialProvider,
      linkedAt: a.linkedAt,
    })),
  };
}

/**
 * Disconnects a Google, Facebook or Apple account, unless it is the member's
 * last way to sign in. Checked here rather than by Better Auth, which does not
 * count phone and email codes as a way in.
 */
export async function unlinkProvider(db: Executor, actor: Actor, providerId: SocialProvider) {
  const methods = await signInMethods(db, actor);
  if (!methods.providers.some((p) => p.providerId === providerId)) {
    throw new AppError('NOT_FOUND', 'errors.notFound');
  }
  if (!canRemoveProvider(methods, providerId)) {
    throw new AppError('BAD_REQUEST', 'errors.lastSignInMethod');
  }
  await db
    .delete(schema.accounts)
    .where(
      and(eq(schema.accounts.userId, actor.userId), eq(schema.accounts.providerId, providerId)),
    );
}
