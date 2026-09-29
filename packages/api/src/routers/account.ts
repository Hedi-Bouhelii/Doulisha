import { completeSignUpSchema, passwordSchema } from '@doulisha/validators';
import { z } from 'zod';

import { accountStatus, completeSignUp, setFirstPassword } from '../services/account';
import { ensureProfileFromAccount } from '../services/organizers';
import { protectedProcedure, router } from '../trpc';

/** Account setup after a code sign-up (ACC-01, ACC-05, ADR 0016). */
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

  /** "Become an organizer" from an existing account: a prefilled profile. */
  becomeOrganizer: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await ensureProfileFromAccount(ctx.db, ctx.actor);
    return { organizerProfileId: profile.id };
  }),
});
