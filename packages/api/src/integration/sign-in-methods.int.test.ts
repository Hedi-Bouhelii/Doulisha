/**
 * Integration test on a real Neon branch: "Connected accounts" (ADR 0019).
 * A member signed up with Facebook only (no email from Facebook) cannot
 * disconnect it; once a password exists, they can. Google or Facebook sign-up
 * needs no password to finish account setup.
 *
 * Run with `pnpm --filter @doulisha/api test:integration` (needs DATABASE_URL,
 * refuses the production branch). It creates its own user and cleans up.
 */
import { createHttpDb, schema } from '@doulisha/db';
import { loadRootEnv, requireEnv } from '@doulisha/db/load-env';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Actor } from '../permissions';
import { accountStatus, signInMethods, unlinkProvider } from '../services/account';

loadRootEnv();
if (process.env.NEON_BRANCH === 'production') {
  throw new Error('Integration tests must not run against the production branch');
}
const db = createHttpDb(requireEnv('DATABASE_URL'));

const run = `it-social-${Date.now()}`;
let actor: Actor;

beforeAll(async () => {
  const [user] = await db
    .insert(schema.users)
    .values({ name: 'Leila Facebook', email: `${run}@facebook.doulisha.invalid` })
    .returning();
  actor = { userId: user!.id, roles: ['participant'], isAnonymous: false };
  await db
    .insert(schema.accounts)
    .values({ userId: user!.id, providerId: 'facebook', accountId: run });
});

afterAll(async () => {
  if (actor) await db.delete(schema.users).where(eq(schema.users.id, actor.userId));
});

describe('connected accounts', () => {
  it('needs no password to finish setup with a social account', async () => {
    const status = await accountStatus(db, actor);
    expect(status.hasSocial).toBe(true);
    expect(status.hasPassword).toBe(false);
    expect(status.needsSetup).toBe(false);
  });

  it('hides the placeholder email and lists Facebook', async () => {
    const methods = await signInMethods(db, actor);
    expect(methods.email).toBeNull();
    expect(methods.phone).toBeNull();
    expect(methods.providers.map((p) => p.providerId)).toEqual(['facebook']);
  });

  it('refuses to remove the last way to sign in', async () => {
    await expect(unlinkProvider(db, actor, 'facebook')).rejects.toMatchObject({
      messageKey: 'errors.lastSignInMethod',
    });
    await expect(unlinkProvider(db, actor, 'google')).rejects.toMatchObject({
      messageKey: 'errors.notFound',
    });
  });

  it('removes Facebook once a password exists', async () => {
    await db
      .insert(schema.accounts)
      .values({ userId: actor.userId, providerId: 'credential', accountId: actor.userId });
    await unlinkProvider(db, actor, 'facebook');
    const methods = await signInMethods(db, actor);
    expect(methods.providers).toEqual([]);
    expect(methods.hasPassword).toBe(true);
  });
});
