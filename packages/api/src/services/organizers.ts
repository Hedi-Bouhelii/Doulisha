import { grantRole } from '@doulisha/auth';
import type { Db, Executor } from '@doulisha/db';
import { schema } from '@doulisha/db';
import type { Locale } from '@doulisha/i18n';
import type { organizerProfileInputSchema } from '@doulisha/validators';
import { and, asc, count, eq, isNull } from 'drizzle-orm';
import type { z } from 'zod';

import type { ServiceDeps } from '../deps';
import { makeSlug } from '../domain/slug';
import { AppError } from '../errors';
import type { Actor } from '../permissions';
import { listUpcomingPublicEvents } from './events';
import { publicUrlFromKey } from './uploads';

type OrganizerInput = z.infer<typeof organizerProfileInputSchema>;
type Storage = Pick<ServiceDeps, 'storage'>;

/** Past-event photos per organizer (founder decision, OPEN_QUESTIONS Q21). */
export const MAX_ORGANIZER_PHOTOS = 12;

const PLACEHOLDER_EMAIL = /@(phone|guest)\.doulisha\.invalid$/;

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
    )
    .orderBy(asc(schema.organizerProfiles.createdAt));
}

async function loadOwnProfile(db: Executor, actor: Actor, id: string) {
  const [profile] = await db
    .select()
    .from(schema.organizerProfiles)
    .where(
      and(
        eq(schema.organizerProfiles.id, id),
        eq(schema.organizerProfiles.ownerUserId, actor.userId),
        isNull(schema.organizerProfiles.deletedAt),
      ),
    );
  if (!profile) throw new AppError('NOT_FOUND', 'errors.notFound');
  return profile;
}

/** Fields both create and update write; images only when a new key is sent. */
function profileValues(deps: Storage, actor: Actor, input: OrganizerInput) {
  const socialLinks = Object.fromEntries(
    Object.entries(input.socialLinks).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  );
  const paymentInstructions = Object.fromEntries(
    Object.entries(input.paymentInstructions).filter(([, v]) => v !== undefined && v !== ''),
  );
  return {
    name: input.name,
    bio: input.bio ?? null,
    legalStatus: input.legalStatus,
    categories: input.categories,
    regions: input.regions,
    socialLinks,
    contactPhone: input.contactPhone ?? null,
    contactEmail: input.contactEmail ?? null,
    paymentInstructions,
    ...(input.logoKey === undefined
      ? {}
      : {
          logoUrl:
            input.logoKey === null
              ? null
              : publicUrlFromKey(deps, actor, input.logoKey, 'organizer-logo'),
        }),
    ...(input.coverKey === undefined
      ? {}
      : {
          coverUrl:
            input.coverKey === null
              ? null
              : publicUrlFromKey(deps, actor, input.coverKey, 'organizer-cover'),
        }),
  };
}

/**
 * Creates an organizer profile and grants the organizer role (ACC-05). The
 * profile is unverified until an admin approves the documents (ACC-04, Phase 5).
 */
export async function createProfile(
  db: Executor,
  deps: Storage,
  actor: Actor,
  input: OrganizerInput,
) {
  const [profile] = await db
    .insert(schema.organizerProfiles)
    .values({
      ownerUserId: actor.userId,
      slug: makeSlug(input.name),
      ...profileValues(deps, actor, input),
    })
    .returning();
  await grantRole(db, actor.userId, 'organizer');
  return profile!;
}

export async function updateProfile(
  db: Executor,
  deps: Storage,
  actor: Actor,
  id: string,
  input: OrganizerInput,
) {
  await loadOwnProfile(db, actor, id);
  const [profile] = await db
    .update(schema.organizerProfiles)
    .set(profileValues(deps, actor, input))
    .where(eq(schema.organizerProfiles.id, id))
    .returning();
  return profile!;
}

/**
 * The organizer profile made at sign-up, prefilled from what the member
 * entered (name, city, verified phone or email). Returns the existing profile
 * if there is one.
 */
export async function ensureProfileFromAccount(db: Executor, actor: Actor) {
  const [existing] = await listOwnProfiles(db, actor);
  if (existing) return existing;
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
  const [profile] = await db
    .insert(schema.organizerProfiles)
    .values({
      ownerUserId: actor.userId,
      slug: makeSlug(user.name),
      name: user.name,
      legalStatus: 'independent',
      regions: user.city ? [user.city] : [],
      contactPhone: user.phoneNumber,
      contactEmail: PLACEHOLDER_EMAIL.test(user.email) ? null : user.email,
    })
    .returning();
  await grantRole(db, actor.userId, 'organizer');
  return profile!;
}

/** The member's profile with its photos, for the organizer space. */
export async function getOwnProfileDetail(db: Executor, actor: Actor) {
  const [profile] = await listOwnProfiles(db, actor);
  if (!profile) return null;
  const photos = await listPhotos(db, profile.id);
  return { ...profile, photos };
}

function listPhotos(db: Executor, organizerProfileId: string) {
  return db
    .select({
      id: schema.organizerPhotos.id,
      url: schema.organizerPhotos.url,
      caption: schema.organizerPhotos.caption,
    })
    .from(schema.organizerPhotos)
    .where(eq(schema.organizerPhotos.organizerProfileId, organizerProfileId))
    .orderBy(asc(schema.organizerPhotos.sort), asc(schema.organizerPhotos.createdAt));
}

/** Adds an uploaded photo of a past event to the gallery (at most 12). */
export async function addPhoto(
  db: Executor,
  deps: Storage,
  actor: Actor,
  input: { profileId: string; key: string; caption?: string | null | undefined },
) {
  await loadOwnProfile(db, actor, input.profileId);
  const [row] = await db
    .select({ n: count() })
    .from(schema.organizerPhotos)
    .where(eq(schema.organizerPhotos.organizerProfileId, input.profileId));
  const existing = row?.n ?? 0;
  if (existing >= MAX_ORGANIZER_PHOTOS) {
    throw new AppError('BAD_REQUEST', 'errors.tooManyPhotos', { max: MAX_ORGANIZER_PHOTOS });
  }
  const [photo] = await db
    .insert(schema.organizerPhotos)
    .values({
      organizerProfileId: input.profileId,
      url: publicUrlFromKey(deps, actor, input.key, 'organizer-photo'),
      caption: input.caption ?? null,
      sort: existing,
    })
    .returning({ id: schema.organizerPhotos.id, url: schema.organizerPhotos.url });
  return photo!;
}

export async function removePhoto(db: Executor, actor: Actor, photoId: string) {
  const [photo] = await db
    .select({ profileId: schema.organizerPhotos.organizerProfileId })
    .from(schema.organizerPhotos)
    .where(eq(schema.organizerPhotos.id, photoId));
  if (!photo) throw new AppError('NOT_FOUND', 'errors.notFound');
  await loadOwnProfile(db, actor, photo.profileId);
  await db.delete(schema.organizerPhotos).where(eq(schema.organizerPhotos.id, photoId));
}

/**
 * Public organizer page (ACC-03): profile, contacts, photos and upcoming
 * public events. Payment details stay private: buyers see them only on their
 * own booking.
 */
export async function getPublicProfile(db: Db, locale: Locale, slug: string) {
  const [profile] = await db
    .select()
    .from(schema.organizerProfiles)
    .where(
      and(eq(schema.organizerProfiles.slug, slug), isNull(schema.organizerProfiles.deletedAt)),
    );
  if (!profile) throw new AppError('NOT_FOUND', 'errors.notFound');
  const [photos, events] = await Promise.all([
    listPhotos(db, profile.id),
    listUpcomingPublicEvents(db, locale, { limit: 12, organizerProfileId: profile.id }),
  ]);
  return {
    id: profile.id,
    slug: profile.slug,
    name: profile.name,
    bio: profile.bio,
    logoUrl: profile.logoUrl,
    coverUrl: profile.coverUrl,
    categories: profile.categories,
    regions: profile.regions,
    socialLinks: profile.socialLinks,
    contactPhone: profile.contactPhone,
    contactEmail: profile.contactEmail,
    legalStatus: profile.legalStatus,
    verified: profile.verifiedAt !== null,
    memberSince: profile.createdAt,
    photos,
    events,
  };
}
