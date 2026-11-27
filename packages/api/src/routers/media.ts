import { mediaUploadKinds } from '@doulisha/storage';
import { z } from 'zod';

import { confirmMediaUpload, signMediaUpload } from '../services/media';
import { publicProcedure, router } from '../trpc';

const kind = z.enum(mediaUploadKinds);

/**
 * Module MED uploads (spec 2.3, ADR 0026). Spec 2.3 names the signing route
 * `POST /api/media/sign`; it is this router's `sign` (`POST /api/trpc/media.sign`),
 * since the API is tRPC (BUILD_PROMPT section 3). Guests may send payment proofs.
 */
export const mediaRouter = router({
  /** Signed parameters to send the original file straight to storage. */
  sign: publicProcedure
    .input(
      z.object({
        kind,
        contentType: z.string().max(100),
        size: z.number().int().positive(),
        eventId: z.uuid().optional(),
        organizerProfileId: z.uuid().optional(),
        reference: z.string().min(4).max(40).optional(),
      }),
    )
    .mutation(({ ctx, input }) => signMediaUpload(ctx.db, ctx.deps, ctx.actor, input)),

  /** Records the upload after checking the storage's signed answer. */
  confirm: publicProcedure
    .input(
      z.object({
        kind,
        answer: z.object({
          public_id: z.string().min(1).max(300),
          version: z.number().int().positive(),
          width: z.number().int().positive().optional(),
          height: z.number().int().positive().optional(),
          format: z.string().min(2).max(10),
          bytes: z.number().int().positive(),
          signature: z.string().min(8).max(128),
        }),
        size: z.number().int().positive(),
        checksumSha256: z.string().regex(/^[0-9a-f]{64}$/),
        eventId: z.uuid().optional(),
      }),
    )
    .mutation(({ ctx, input }) => confirmMediaUpload(ctx.db, ctx.deps, ctx.actor, input)),
});
