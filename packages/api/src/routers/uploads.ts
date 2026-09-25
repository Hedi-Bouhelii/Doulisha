import { uploadPurposes } from '@doulisha/storage';
import { z } from 'zod';

import { createUpload } from '../services/uploads';
import { publicProcedure, router } from '../trpc';

export const uploadsRouter = router({
  /**
   * Presigned upload: checks type and size, returns where to PUT the file and
   * the object key to attach afterwards. Guests may upload payment proofs.
   */
  create: publicProcedure
    .input(
      z.object({
        purpose: z.enum(uploadPurposes),
        contentType: z.string().max(100),
        size: z.number().int().positive(),
      }),
    )
    .mutation(({ ctx, input }) => createUpload(ctx.deps, ctx.actor, input)),
});
