import type { Db, Executor } from '@doulisha/db';
import { schema } from '@doulisha/db';
import type { Locale } from '@doulisha/i18n';
import { and, asc, count, desc, eq, gt, inArray, isNull, notInArray, sql } from 'drizzle-orm';

import { AppError } from '../errors';
import type { Actor } from '../permissions';
import { listUpcomingPublicEvents } from './events';

const f = schema.follows;
const organizerTarget = eq(f.targetType, 'organizer');

async function loadProfile(db: Executor, organizerProfileId: string) {
  const [profile] = await db
    .select({ id: schema.organizerProfiles.id, ownerUserId: schema.organizerProfiles.ownerUserId })
    .from(schema.organizerProfiles)
    .where(
      and(
        eq(schema.organizerProfiles.id, organizerProfileId),
        isNull(schema.organizerProfiles.deletedAt),
      ),
    );
  if (!profile) throw new AppError('NOT_FOUND', 'errors.notFound');
  return profile;
}

/** SOC-01: follow an organizer to see their new events in the feed. */
export async function followOrganizer(db: Executor, actor: Actor, organizerProfileId: string) {
  const profile = await loadProfile(db, organizerProfileId);
  if (profile.ownerUserId === actor.userId) {
    throw new AppError('BAD_REQUEST', 'errors.cannotFollowSelf');
  }
  await db
    .insert(f)
    .values({ followerId: actor.userId, targetType: 'organizer', targetId: organizerProfileId })
    .onConflictDoNothing();
}

export async function unfollowOrganizer(db: Executor, actor: Actor, organizerProfileId: string) {
  await db
    .delete(f)
    .where(
      and(eq(f.followerId, actor.userId), organizerTarget, eq(f.targetId, organizerProfileId)),
    );
}

export async function followerCount(db: Executor, organizerProfileId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(f)
    .where(and(organizerTarget, eq(f.targetId, organizerProfileId)));
  return row?.n ?? 0;
}

export async function isFollowing(db: Executor, actor: Actor | null, organizerProfileId: string) {
  if (!actor || actor.isAnonymous) return false;
  const [row] = await db
    .select({ id: f.targetId })
    .from(f)
    .where(and(eq(f.followerId, actor.userId), organizerTarget, eq(f.targetId, organizerProfileId)))
    .limit(1);
  return Boolean(row);
}

/** Organizers the member follows, by name. */
export async function listFollowedOrganizers(db: Executor, actor: Actor) {
  return db
    .select({
      id: schema.organizerProfiles.id,
      slug: schema.organizerProfiles.slug,
      name: schema.organizerProfiles.name,
      logoUrl: schema.organizerProfiles.logoUrl,
    })
    .from(f)
    .innerJoin(schema.organizerProfiles, eq(schema.organizerProfiles.id, f.targetId))
    .where(
      and(
        eq(f.followerId, actor.userId),
        organizerTarget,
        isNull(schema.organizerProfiles.deletedAt),
      ),
    )
    .orderBy(asc(schema.organizerProfiles.name));
}

/**
 * SOC-03 feed: upcoming public events of the organizers the member follows,
 * plus organizers to follow (those with the most upcoming public events).
 * Private and unlisted events never appear (TRS-06).
 */
export async function getFeed(db: Db, actor: Actor, locale: Locale, now = new Date()) {
  const following = await listFollowedOrganizers(db, actor);
  const followedIds = following.map((o) => o.id);
  const e = schema.events;
  const [events, suggestions] = await Promise.all([
    listUpcomingPublicEvents(db, locale, { limit: 30, organizerProfileIds: followedIds }, now),
    db
      .select({
        id: schema.organizerProfiles.id,
        slug: schema.organizerProfiles.slug,
        name: schema.organizerProfiles.name,
        logoUrl: schema.organizerProfiles.logoUrl,
        upcoming: count(e.id),
      })
      .from(schema.organizerProfiles)
      .innerJoin(e, eq(e.organizerProfileId, schema.organizerProfiles.id))
      .where(
        and(
          isNull(schema.organizerProfiles.deletedAt),
          sql`${schema.organizerProfiles.ownerUserId} <> ${actor.userId}`,
          followedIds.length ? notInArray(schema.organizerProfiles.id, followedIds) : undefined,
          eq(e.visibility, 'public'),
          inArray(e.status, ['published', 'full']),
          isNull(e.deletedAt),
          gt(e.startsAt, now),
        ),
      )
      .groupBy(schema.organizerProfiles.id)
      .orderBy(desc(count(e.id)), asc(schema.organizerProfiles.name))
      .limit(6),
  ]);
  return { following, events, suggestions };
}
