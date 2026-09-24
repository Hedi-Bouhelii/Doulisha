import type { Db } from '@doulisha/db';
import { schema } from '@doulisha/db';
import type { Locale } from '@doulisha/i18n';
import type { EventBrief } from '@doulisha/templates';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import { AppError } from '../errors';
import { placesLeft } from './events';

export interface EventDetailDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  language: Locale;
  coverUrl: string | null;
  status: (typeof schema.eventStatus.enumValues)[number];
  model: (typeof schema.eventModel.enumValues)[number];
  startsAt: Date;
  endsAt: Date | null;
  venueName: string | null;
  /** Null when the organizer reveals the address after booking (EVT-02). */
  address: string | null;
  city: string | null;
  locationHidden: boolean;
  minAge: number | null;
  capacity: number | null;
  placesTaken: number;
  placesLeft: number | null;
  registrationType: (typeof schema.registrationType.enumValues)[number];
  priceFromMillimes: number | null;
  cancellationPolicy: (typeof schema.cancellationPolicy.enumValues)[number];
  brief: EventBrief;
  category: { slug: string; name: string; icon: string; accent: string };
  templateName: string;
  organizer: {
    name: string;
    slug: string;
    logoUrl: string | null;
    bio: string | null;
    verified: boolean;
  } | null;
  ticketTypes: {
    id: string;
    name: string;
    kind: string;
    priceMillimes: number;
    soldOut: boolean;
  }[];
  meetingPoints: { id: string; name: string; meetAt: Date }[];
  programme: { id: string; title: string; startsAt: Date | null; day: number }[];
  /** Attendees who chose to show their attendance publicly (ACC-06). */
  publicAttendees: { name: string; image: string | null }[];
}

/** Statuses a visitor may open. Drafts stay private to their organizer. */
const viewableStatuses = ['published', 'full', 'closed', 'ongoing', 'completed'] as const;

/**
 * An event page (DSC-03). Private events are never shown here; they are only
 * reachable through an invitation (INV-02, Phase 2), so they return NOT_FOUND
 * like missing events and nobody can probe for them (TRS-06).
 */
export async function getEventBySlug(
  db: Db,
  locale: Locale,
  slug: string,
): Promise<EventDetailDto> {
  const e = schema.events;
  const [row] = await db
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
    .where(
      and(
        eq(e.slug, slug),
        inArray(e.visibility, ['public', 'unlisted']),
        inArray(e.status, [...viewableStatuses]),
        isNull(e.deletedAt),
      ),
    )
    .limit(1);
  if (!row) throw new AppError('NOT_FOUND', 'errors.notFound');
  const { event, category, templateName, organizer } = row;

  const [tickets, points, steps, attendees] = await Promise.all([
    db
      .select()
      .from(schema.ticketTypes)
      .where(and(eq(schema.ticketTypes.eventId, event.id), eq(schema.ticketTypes.isActive, true)))
      .orderBy(asc(schema.ticketTypes.sort)),
    db
      .select()
      .from(schema.meetingPoints)
      .where(eq(schema.meetingPoints.eventId, event.id))
      .orderBy(asc(schema.meetingPoints.sort)),
    db
      .select()
      .from(schema.itinerarySteps)
      .where(eq(schema.itinerarySteps.eventId, event.id))
      .orderBy(asc(schema.itinerarySteps.day), asc(schema.itinerarySteps.sort)),
    db
      .select({ name: schema.users.name, image: schema.users.image })
      .from(schema.attendees)
      .innerJoin(schema.users, eq(schema.users.id, schema.attendees.userId))
      .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.users.id))
      .where(
        and(
          eq(schema.attendees.eventId, event.id),
          eq(schema.profiles.attendanceVisibility, 'public'),
        ),
      )
      .limit(6),
  ]);

  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    language: event.language,
    coverUrl: event.coverUrl,
    status: event.status,
    model: event.model,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    venueName: event.venueName,
    address: event.locationHiddenUntilBooking ? null : event.address,
    city: event.city,
    locationHidden: event.locationHiddenUntilBooking,
    minAge: event.minAge,
    capacity: event.capacity,
    placesTaken: event.placesTaken,
    placesLeft: placesLeft(event.capacity, event.placesTaken),
    registrationType: event.registrationType,
    priceFromMillimes: event.priceFromMillimes,
    cancellationPolicy: event.cancellationPolicy,
    brief: event.brief,
    category: {
      slug: category.slug,
      name: category.name[locale],
      icon: category.icon,
      accent: category.accent,
    },
    templateName: templateName[locale],
    organizer: organizer
      ? {
          name: organizer.name,
          slug: organizer.slug,
          logoUrl: organizer.logoUrl,
          bio: organizer.bio,
          verified: organizer.verifiedAt !== null,
        }
      : null,
    ticketTypes: tickets.map((t) => ({
      id: t.id,
      name: t.name,
      kind: t.kind,
      priceMillimes: t.priceMillimes,
      soldOut: t.quantity !== null && t.sold >= t.quantity,
    })),
    meetingPoints: points.map((p) => ({ id: p.id, name: p.name, meetAt: p.meetAt })),
    programme: steps.map((s) => ({ id: s.id, title: s.title, startsAt: s.startsAt, day: s.day })),
    publicAttendees: attendees,
  };
}
