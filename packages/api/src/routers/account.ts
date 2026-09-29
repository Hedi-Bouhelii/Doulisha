import { completeSignUpSchema, passwordSchema } from '@doulisha/validators';
import { z } from 'zod';

import { SOCIAL_PROVIDERS } from '../domain/sign-in-methods';
import {
  accountStatus,
  completeSignUp,
  setFirstPassword,
  signInMethods,
  unlinkProvider,
} from '../services/account';
import { getPrivacy, updatePrivacy } from '../services/members';
import { ensureProfileFromAccount } from '../services/organizers';
import { protectedProcedure, router } from '../trpc';

/** Account setup and sign-in methods (ACC-01, ACC-05, ADR 0016, ADR 0019). */
export const accountRouter = router({
  /** Whether the member still has to choose a name or a password. */
  status: protectedProcedure.query(({ ctx }) => accountStatus(ctx.db, ctx.actor)),

  /** Name, city, password and account type; organizers get a prefilled profile. */
  completeSignUp: protectedProcedure.input(completeSignUpSchema).mutation(({ ctx, input }) =>
    completeSignUp(
      ctx.db,
      ctx.actor,
      async (newPassword) => {
        await ctx.auth.api.setPassword({ body: { newPassword }, headers: ctx.headers });
      },
      input,
    ),
  ),

  /** Adds a password to an account created before passwords existed. */
  setPassword: protectedProcedure
    .input(z.object({ password: passwordSchema }))
    .mutation(({ ctx, input }) =>
      setFirstPassword(
        ctx.db,
        ctx.actor,
        async (newPassword) => {
          await ctx.auth.api.setPassword({ body: { newPassword }, headers: ctx.headers });
        },
        input.password,
      ),
    ),

  /** Phone, email, password and connected Google / Facebook / Apple accounts. */
  signInMethods: protectedProcedure.query(({ ctx }) => signInMethods(ctx.db, ctx.actor)),

  /** Disconnects a social account; refused for the last way to sign in. */
  unlinkProvider: protectedProcedure
    .input(z.object({ providerId: z.enum(SOCIAL_PROVIDERS) }))
    .mutation(({ ctx, input }) => unlinkProvider(ctx.db, ctx.actor, input.providerId)),

  /** ACC-06: who sees the profile and the events the member attends. */
  privacy: protectedProcedure.query(({ ctx }) => getPrivacy(ctx.db, ctx.actor)),

  setPrivacy: protectedProcedure
    .input(
      z.object({
        visibility: z.enum(['public', 'private']),
        attendanceVisibility: z.enum(['public', 'private']),
      }),
    )
    .mutation(({ ctx, input }) => updatePrivacy(ctx.db, ctx.actor, input)),

  /** "Become an organizer" from an existing account: a prefilled profile. */
  becomeOrganizer: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await ensureProfileFromAccount(ctx.db, ctx.actor);
    return { organizerProfileId: profile.id };
  }),
});
