import type { Db } from '@doulisha/db';
import { schema } from '@doulisha/db';
import type { Locale } from '@doulisha/i18n';
import { and, asc, eq, gt, inArray, isNull, type SQL } from 'drizzle-orm';

/** Data an event card needs (DSC-03 cards, template "Trending events"). */
export interface EventCardDto {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  startsAt: Date;
  city: string | null;
  venueName: string | null;
  category: { slug: string; name: string; icon: string; accent: string };
  templateName: string;
  registrationType: (typeof schema.registrationType.enumValues)[number];
  priceFromMillimes: number | null;
  capacity: number | null;
  placesTaken: number;
  placesLeft: number | null;
  organizer: { name: string; slug: string; verified: boolean } | null;
}

/** Places left for "18/25" counters; null when the event has no capacity limit. */
export function placesLeft(capacity: number | null, placesTaken: number): number | null {
  if (capacity === null) return null;
  return Math.max(0, capacity - placesTaken);
}

/**
 * Conditions every publicly listed event must meet. Private and unlisted
 * events are never listed (TRS-06), and past events are hidden (spec section 4).
 */
export function publicListingConditions(now: Date): SQL[] {
  return [
    eq(schema.events.visibility, 'public'),
    inArray(schema.events.status, ['published', 'full']),
    isNull(schema.events.deletedAt),
    gt(schema.events.startsAt, now),
  ];
}

export interface ListUpcomingInput {
  limit: number;
  categorySlug?: string | undefined;
}

/** Upcoming public events, soonest first. */
export async function listUpcomingPublicEvents(
  db: Db,
  locale: Locale,
  input: ListUpcomingInput,
  now = new Date(),
): Promise<EventCardDto[]> {
  const e = schema.events;
  const conditions = publicListingConditions(now);
  if (input.categorySlug) conditions.push(eq(schema.categories.slug, input.categorySlug));

  const rows = await db
    .select({
      event: e,
      category: schema.categories,
      templateName: schema.templates.name,
      organizer: schema.organizerProfiles,
    })
    .from(e)
    .innerJoin(schema.categories, eq(schema.categories.id, e.categoryId))
    .innerJoin(schema.templates, eq(schema.templates.id, e.templateId))
    .leftJoin(schema.organizerProfiles, eq(schema.organizerProfiles.id, e.organizerProfileId))
    .where(and(...conditions))
    .orderBy(asc(e.startsAt))
    .limit(input.limit);

  return rows.map(({ event, category, templateName, organizer }) => ({
    id: event.id,
    slug: event.slug,
    title: event.title,
    coverUrl: event.coverUrl,
    startsAt: event.startsAt,
    city: event.city,
    venueName: event.venueName,
    category: {
      slug: category.slug,
      name: category.name[locale],
      icon: category.icon,
      accent: category.accent,
    },
    templateName: templateName[locale],
    registrationType: event.registrationType,
    priceFromMillimes: event.priceFromMillimes,
    capacity: event.capacity,
    placesTaken: event.placesTaken,
    placesLeft: placesLeft(event.capacity, event.placesTaken),
    organizer: organizer
      ? { name: organizer.name, slug: organizer.slug, verified: organizer.verifiedAt !== null }
      : null,
  }));
}
