import { grantRole } from '@doulisha/auth';
import type { Executor } from '@doulisha/db';
import { schema } from '@doulisha/db';
import type { organizerProfileInputSchema } from '@doulisha/validators';
import { and, eq, isNull } from 'drizzle-orm';
import type { z } from 'zod';

import { makeSlug } from '../domain/slug';
import { AppError } from '../errors';
import type { Actor } from '../permissions';

type OrganizerInput = z.infer<typeof organizerProfileInputSchema>;

/** Organizer profiles the actor owns (ACC-03). */
export function listOwnProfiles(db: Executor, actor: Actor) {
  return db
    .select()
    .from(schema.organizerProfiles)
    .where(
      and(
        eq(schema.organizerProfiles.ownerUserId, actor.userId),
        isNull(schema.organizerProfiles.deletedAt),
      ),
    );
}

/**
 * Creates an organizer profile and grants the organizer role (ACC-05). The
 * profile is unverified until an admin approves the documents (ACC-04, Phase 5).
 */
export async function createProfile(db: Executor, actor: Actor, input: OrganizerInput) {
  const [profile] = await db
    .insert(schema.organizerProfiles)
    .values({
      ownerUserId: actor.userId,
      slug: makeSlug(input.name),
      name: input.name,
      bio: input.bio ?? null,
      legalStatus: input.legalStatus,
      categories: input.categories,
      regions: input.regions,
      socialLinks: input.socialLinks,
    })
    .returning();
  await grantRole(db, actor.userId, 'organizer');
  return profile!;
}

export async function updateProfile(db: Executor, actor: Actor, id: string, input: OrganizerInput) {
  const [profile] = await db
    .update(schema.organizerProfiles)
    .set({
      name: input.name,
      bio: input.bio ?? null,
      legalStatus: input.legalStatus,
      categories: input.categories,
      regions: input.regions,
      socialLinks: input.socialLinks,
    })
    .where(
      and(
        eq(schema.organizerProfiles.id, id),
        eq(schema.organizerProfiles.ownerUserId, actor.userId),
      ),
    )
    .returning();
  if (!profile) throw new AppError('NOT_FOUND', 'errors.notFound');
  return profile;
}
