import { publicProcedure, router } from '../trpc';

export const meRouter = router({
  /**
   * The signed-in user with their roles, or null for visitors.
   * Guests (anonymous sessions) are returned with `isAnonymous: true`.
   */
  get: publicProcedure.query(({ ctx }) => {
    if (!ctx.session || !ctx.actor) return null;
    const { user } = ctx.session;
    return {
      id: user.id,
      name: user.name,
      image: user.image ?? null,
      phoneNumber: user.phoneNumber ?? null,
      isAnonymous: ctx.actor.isAnonymous,
      roles: ctx.actor.roles,
    };
  }),
});
