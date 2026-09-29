import type { Db } from '@doulisha/db';
import { schema } from '@doulisha/db';
import type { Locale } from '@doulisha/i18n';
import {
  and,
  arrayOverlaps,
  asc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import { whenRange, type WhenFilter } from '../domain/dates';

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
  /** Free text matched against title and city, ignoring case and accents. */
  query?: string | undefined;
  /** Exact city, ignoring case and accents. */
  city?: string | undefined;
  /** DSC-02 date presets in Tunisia time. */
  when?: WhenFilter | undefined;
  price?: 'free' | 'paid' | undefined;
  maxPriceMillimes?: number | undefined;
  /** DSC-01 "for whom". */
  audience?: string[] | undefined;
  /** Only events with places left. */
  available?: boolean | undefined;
  /** DSC-02 "near me": within `radiusKm` of a point (PostGIS). */
  near?: { lat: number; lng: number; radiusKm: number } | undefined;
  /** Events published by one organizer profile (public organizer page). */
  organizerProfileId?: string | undefined;
}

/** DSC-01 filters as SQL conditions (pure, unit-tested). */
export function filterConditions(input: ListUpcomingInput, now: Date): SQL[] {
  const e = schema.events;
  const conditions: SQL[] = [];
  if (input.when) {
    const { from, to } = whenRange(input.when, now);
    conditions.push(gte(e.startsAt, from), lt(e.startsAt, to));
  }
  if (input.price === 'free') {
    conditions.push(sql`coalesce(${e.priceFromMillimes}, 0) = 0`);
  }
  if (input.price === 'paid') conditions.push(gt(e.priceFromMillimes, 0));
  if (input.maxPriceMillimes !== undefined) {
    conditions.push(sql`coalesce(${e.priceFromMillimes}, 0) <= ${input.maxPriceMillimes}`);
  }
  if (input.audience?.length) conditions.push(arrayOverlaps(e.audience, input.audience));
  if (input.available) {
    conditions.push(or(isNull(e.capacity), lt(e.placesTaken, e.capacity))!);
  }
  if (input.near) {
    conditions.push(
      sql`ST_DWithin(${e.location}, ST_SetSRID(ST_MakePoint(${input.near.lng}, ${input.near.lat}), 4326)::geography, ${input.near.radiusKm * 1000})`,
    );
  }
  return conditions;
}

/** Cities that have upcoming public events, for the search city picker. */
export async function listEventCities(db: Db, now = new Date()): Promise<string[]> {
  const rows = await db
    .selectDistinct({ city: schema.events.city })
    .from(schema.events)
    .where(and(...publicListingConditions(now)))
    .orderBy(asc(schema.events.city));
  return rows.flatMap((r) => (r.city ? [r.city] : []));
}

/** Escapes LIKE wildcards so user input is matched literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Accent- and case-insensitive match on title or city (uses the trigram index). */
export function textSearchCondition(query: string): SQL {
  const pattern = `%${escapeLike(query.trim())}%`;
  const needle = sql`immutable_unaccent(lower(${pattern}))`;
  return or(
    sql`immutable_unaccent(lower(${schema.events.title})) like ${needle}`,
    sql`immutable_unaccent(lower(coalesce(${schema.events.city}, ''))) like ${needle}`,
  )!;
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
  if (input.query?.trim()) conditions.push(textSearchCondition(input.query));
  if (input.city) {
    conditions.push(
      sql`immutable_unaccent(lower(${e.city})) = immutable_unaccent(lower(${input.city}))`,
    );
  }
  conditions.push(...filterConditions(input, now));
  if (input.organizerProfileId) {
    conditions.push(eq(e.organizerProfileId, input.organizerProfileId));
  }

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

/** Public upcoming events for the sitemap (DSC-03 SEO). Private and unlisted events never appear. */
export async function listSitemapEvents(
  db: Db,
  now = new Date(),
): Promise<{ slug: string; updatedAt: Date }[]> {
  return db
    .select({ slug: schema.events.slug, updatedAt: schema.events.updatedAt })
    .from(schema.events)
    .where(and(...publicListingConditions(now)))
    .orderBy(asc(schema.events.startsAt))
    .limit(5000);
}
