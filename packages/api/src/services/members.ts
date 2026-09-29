import type { Db, Executor } from '@doulisha/db';
import { schema } from '@doulisha/db';
import type { Locale } from '@doulisha/i18n';
import { and, asc, eq, exists, gt, inArray, isNull } from 'drizzle-orm';

import { AppError } from '../errors';
import type { Actor } from '../permissions';
import { blockedIds } from './blocks';
import { listUpcomingPublicEvents } from './events';

/** ACC-06 choices shown today: friends-only options wait for friendships (Q27). */
export type Visibility = 'public' | 'private';

/** Order statuses that mean "going" (booked, paid or not yet). */
const ATTENDING = ['awaiting_payment', 'partially_paid', 'paid'] as const;

/**
 * A member's public page (ADR 0022): name, photo, city, bio, their organizer
 * page, and the public events they attend when they allow it. A private
 * profile shows only the name and photo. Guests without an account have none.
 */
export async function getMemberProfile(
  db: Db,
  locale: Locale,
  actor: Actor | null,
  userId: string,
  now = new Date(),
) {
  const [row] = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      image: schema.users.image,
      isAnonymous: schema.users.isAnonymous,
      memberSince: schema.users.createdAt,
      city: schema.profiles.city,
      bio: schema.profiles.bio,
      visibility: schema.profiles.visibility,
      attendanceVisibility: schema.profiles.attendanceVisibility,
    })
    .from(schema.users)
    .leftJoin(schema.profiles, eq(schema.profiles.userId, schema.users.id))
    .where(eq(schema.users.id, userId));
  if (!row || row.isAnonymous) throw new AppError('NOT_FOUND', 'errors.notFound');

  const isSelf = actor?.userId === userId;
  const viewerBlocked = actor ? (await blockedIds(db, actor.userId)).has(userId) : false;
  const base = { id: row.id, name: row.name, image: row.image, isSelf, viewerBlocked };
  if (row.visibility !== 'public' && !isSelf) {
    return { ...base, isPrivate: true as const };
  }

  const [organizer] = await db
    .select({ slug: schema.organizerProfiles.slug, name: schema.organizerProfiles.name })
    .from(schema.organizerProfiles)
    .where(
      and(
        eq(schema.organizerProfiles.ownerUserId, userId),
        isNull(schema.organizerProfiles.deletedAt),
      ),
    )
    .orderBy(asc(schema.organizerProfiles.createdAt))
    .limit(1);

  const showAttending = isSelf || row.attendanceVisibility === 'public';
  let attending: Awaited<ReturnType<typeof listUpcomingPublicEvents>> = [];
  if (showAttending) {
    const booked = await db
      .selectDistinct({ eventId: schema.orders.eventId })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.buyerId, userId),
          inArray(schema.orders.status, [...ATTENDING]),
          exists(
            db
              .select({ id: schema.events.id })
              .from(schema.events)
              .where(
                and(eq(schema.events.id, schema.orders.eventId), gt(schema.events.startsAt, now)),
              ),
          ),
        ),
      );
    const ids = booked.flatMap((b) => (b.eventId ? [b.eventId] : []));
    // Public events only: private and unlisted ones never show here (TRS-06).
    attending = await listUpcomingPublicEvents(db, locale, { limit: 24, eventIds: ids }, now);
  }

  return {
    ...base,
    isPrivate: false as const,
    city: row.city,
    bio: row.bio,
    memberSince: row.memberSince,
    organizer: organizer ?? null,
    showAttending,
    /** Whether others see the events (the member always sees their own). */
    attendancePublic: row.attendanceVisibility === 'public',
    attending,
  };
}

/** ACC-06 settings as shown in "My account" (friends-only reads as private). */
export async function getPrivacy(db: Executor, actor: Actor) {
  const [row] = await db
    .select({
      visibility: schema.profiles.visibility,
      attendanceVisibility: schema.profiles.attendanceVisibility,
    })
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, actor.userId));
  const shown = (value: string | undefined): Visibility =>
    value === 'public' ? 'public' : 'private';
  return {
    visibility: row ? shown(row.visibility) : 'public',
    attendanceVisibility: row ? shown(row.attendanceVisibility) : 'private',
  };
}

export async function updatePrivacy(
  db: Executor,
  actor: Actor,
  input: { visibility: Visibility; attendanceVisibility: Visibility },
) {
  await db
    .insert(schema.profiles)
    .values({ userId: actor.userId, ...input })
    .onConflictDoUpdate({ target: schema.profiles.userId, set: input });
}
