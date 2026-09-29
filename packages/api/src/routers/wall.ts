import { z } from 'zod';

import {
  COMMENT_MAX_LENGTH,
  POST_MAX_LENGTH,
  POST_MAX_PHOTOS,
  REACTION_KINDS,
} from '../domain/wall-rules';
import {
  addComment,
  createPost,
  listWall,
  react,
  removeComment,
  removePost,
} from '../services/wall';
import { protectedProcedure, publicProcedure, router } from '../trpc';

/** Event wall on public and unlisted events (SOC-04, SOC-05, ADR 0022). */
export const wallRouter = router({
  /** Posts latest first with photos, comments and reactions; `cursor` for the next page. */
  list: publicProcedure
    .input(z.object({ eventId: z.uuid(), cursor: z.coerce.date().nullish() }))
    .query(({ ctx, input }) =>
      listWall(ctx.db, ctx.deps, ctx.actor, input.eventId, input.cursor ?? null),
    ),

  post: protectedProcedure
    .input(
      z.object({
        eventId: z.uuid(),
        body: z.string().max(POST_MAX_LENGTH),
        photoKeys: z.array(z.string().min(1).max(300)).max(POST_MAX_PHOTOS).default([]),
      }),
    )
    .mutation(({ ctx, input }) => createPost(ctx.db, ctx.actor, input)),

  removePost: protectedProcedure
    .input(z.object({ postId: z.uuid() }))
    .mutation(({ ctx, input }) => removePost(ctx.db, ctx.actor, input.postId)),

  comment: protectedProcedure
    .input(z.object({ postId: z.uuid(), body: z.string().max(COMMENT_MAX_LENGTH) }))
    .mutation(({ ctx, input }) => addComment(ctx.db, ctx.actor, input)),

  removeComment: protectedProcedure
    .input(z.object({ commentId: z.uuid() }))
    .mutation(({ ctx, input }) => removeComment(ctx.db, ctx.actor, input.commentId)),

  /** One reaction per member and post or comment; `kind: null` removes it. */
  react: protectedProcedure
    .input(
      z.object({
        targetType: z.enum(['post', 'comment']),
        targetId: z.uuid(),
        kind: z.enum(REACTION_KINDS).nullable(),
      }),
    )
    .mutation(({ ctx, input }) => react(ctx.db, ctx.actor, input)),
});
