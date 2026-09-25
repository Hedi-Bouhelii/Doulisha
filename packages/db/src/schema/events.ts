import type { EventBrief, TemplateDefinitionData } from '@doulisha/templates';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { deletedAt, geographyPoint, id, timestamps, type LocalizedText } from './columns';
import {
  cancellationPolicy,
  eventModel,
  eventStatus,
  eventVisibility,
  invitationChannel,
  locale,
  questionType,
  registrationType,
  rsvpStatus,
  ticketKind,
} from './enums';
import { organizerProfiles, users } from './identity';

/** Spec 1.3 categories. Names in ar/fr/en; each has an icon and accent colour. */
export const categories = pgTable('categories', {
  id: id(),
  slug: text().notNull().unique(),
  name: jsonb().$type<LocalizedText>().notNull(),
  /** lucide icon name, e.g. "mountain". */
  icon: text().notNull(),
  /** Token name from @doulisha/ui-tokens, e.g. "outdoor". */
  accent: text().notNull(),
  sort: integer().notNull().default(0),
  isActive: boolean().notNull().default(true),
  ...timestamps(),
});

/**
 * EVT-09 category templates, editable by admins as data. The template's
 * `definition` drives the wizard fields, brief, policy, modules and filters.
 */
export const templates = pgTable(
  'templates',
  {
    id: id(),
    key: text().notNull().unique(),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    model: eventModel().notNull(),
    name: jsonb().$type<LocalizedText>().notNull(),
    definition: jsonb().$type<TemplateDefinitionData>().notNull(),
    version: integer().notNull().default(1),
    isActive: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [index().on(t.categoryId)],
);

/** One table for every kind of event (ARCHITECTURE section 4). */
export const events = pgTable(
  'events',
  {
    id: id(),
    slug: text().notNull().unique(),
    /** Public events are published by an organizer profile. */
    organizerProfileId: uuid().references(() => organizerProfiles.id, { onDelete: 'set null' }),
    /** The member who created the event (the host for private events). */
    creatorId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    templateId: uuid()
      .notNull()
      .references(() => templates.id, { onDelete: 'restrict' }),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    model: eventModel().notNull(),
    status: eventStatus().notNull().default('draft'),
    visibility: eventVisibility().notNull().default('public'),

    title: text().notNull(),
    description: text(),
    /** Language the organizer wrote the event in. */
    language: locale().notNull().default('fr'),
    coverUrl: text(),

    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }),
    timezone: text().notNull().default('Africa/Tunis'),

    venueName: text(),
    address: text(),
    city: text(),
    location: geographyPoint(),
    /** EVT-02 "place revealed after booking". */
    locationHiddenUntilBooking: boolean().notNull().default(false),
    minAge: smallint(),
    /** DSC-01 "for whom": solo, couple, friends, family, kids. */
    audience: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),

    /** EVT-04 capacity. Null means unlimited. */
    capacity: integer(),
    minToConfirm: integer(),
    waitlistEnabled: boolean().notNull().default(true),
    /** Places taken, kept in the booking transaction for "18/25" counters. */
    placesTaken: integer().notNull().default(0),

    registrationType: registrationType().notNull().default('free_rsvp'),
    /** Lowest ticket price for cards and search. Null for free events. */
    priceFromMillimes: integer(),
    bookingOpensAt: timestamp({ withTimezone: true }),
    bookingClosesAt: timestamp({ withTimezone: true }),

    /** EVT-05 brief: what to bring, dress code, rules, safety. */
    brief: jsonb().$type<EventBrief>().notNull().default({}),
    cancellationPolicy: cancellationPolicy().notNull().default('moderate'),
    /** Template-specific fields, validated by the template's schema on write. */
    details: jsonb().$type<Record<string, unknown>>().notNull().default({}),

    publishedAt: timestamp({ withTimezone: true }),
    cancelledAt: timestamp({ withTimezone: true }),
    ...timestamps(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index().on(t.status, t.startsAt),
    index().on(t.organizerProfileId),
    index().on(t.creatorId),
    index().on(t.templateId),
    index().on(t.categoryId),
    index().on(t.city),
    index('events_location_gist').using('gist', t.location),
    index('events_title_trgm').using(
      'gin',
      sql`immutable_unaccent(lower(${t.title})) gin_trgm_ops`,
    ),
    check('events_capacity_positive', sql`${t.capacity} is null or ${t.capacity} > 0`),
    check('events_places_taken_valid', sql`${t.placesTaken} >= 0`),
  ],
);

/** Dates of an event. MVP events have one occurrence; recurring events (EVT-10) are V1. */
export const occurrences = pgTable(
  'occurrences',
  {
    id: id(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }),
    capacity: integer(),
    isCancelled: boolean().notNull().default(false),
    ...timestamps(),
  },
  (t) => [index().on(t.eventId, t.startsAt)],
);

/** EVT-06 programme: timeline for one-day events, day-by-day itinerary for trips. */
export const itinerarySteps = pgTable(
  'itinerary_steps',
  {
    id: id(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    day: smallint().notNull().default(1),
    startsAt: timestamp({ withTimezone: true }),
    title: text().notNull(),
    description: text(),
    location: geographyPoint(),
    sort: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [index().on(t.eventId, t.day, t.sort)],
);

/** LOG-01 pick-up points; the participant chooses one at booking. */
export const meetingPoints = pgTable(
  'meeting_points',
  {
    id: id(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    address: text(),
    location: geographyPoint(),
    meetAt: timestamp({ withTimezone: true }).notNull(),
    sort: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [index().on(t.eventId, t.sort)],
);

/** TKT-02 ticket types. `seatsPerTicket` is 2 for couple tickets. */
export const ticketTypes = pgTable(
  'ticket_types',
  {
    id: id(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    kind: ticketKind().notNull().default('standard'),
    name: text().notNull(),
    description: text(),
    priceMillimes: integer().notNull().default(0),
    /** Set for deposit + balance registration (PAY-03). */
    depositMillimes: integer(),
    /** Stock for this type. Null means limited only by event capacity. */
    quantity: integer(),
    sold: integer().notNull().default(0),
    seatsPerTicket: smallint().notNull().default(1),
    salesStartAt: timestamp({ withTimezone: true }),
    salesEndAt: timestamp({ withTimezone: true }),
    sort: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    index().on(t.eventId, t.sort),
    check('ticket_types_price_valid', sql`${t.priceMillimes} >= 0`),
    check('ticket_types_sold_valid', sql`${t.quantity} is null or ${t.sold} <= ${t.quantity}`),
  ],
);

/** TKT-03 custom questions asked at booking. */
export const bookingQuestions = pgTable(
  'booking_questions',
  {
    id: id(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    label: text().notNull(),
    type: questionType().notNull().default('text'),
    options: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    required: boolean().notNull().default(false),
    sort: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [index().on(t.eventId, t.sort)],
);

/** INV-02 invitations. Phone contacts are stored only as a salted hash (spec section 8). */
export const invitations = pgTable(
  'invitations',
  {
    id: id(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    invitedById: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    inviteeUserId: uuid().references(() => users.id, { onDelete: 'cascade' }),
    contactHash: text(),
    channel: invitationChannel().notNull(),
    /** Secret token in the shared link. */
    token: text().notNull().unique(),
    seenAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index().on(t.eventId), index().on(t.invitedById), index().on(t.inviteeUserId)],
);

/**
 * INV-03 RSVPs. Guests without an account get an anonymous user (Better Auth),
 * so every RSVP has a user.
 */
export const rsvps = pgTable(
  'rsvps',
  {
    id: id(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    invitationId: uuid().references(() => invitations.id, { onDelete: 'set null' }),
    guestName: text(),
    status: rsvpStatus().notNull().default('invited'),
    plusOnes: smallint().notNull().default(0),
    dietaryNotes: text(),
    respondedAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex().on(t.eventId, t.userId),
    index().on(t.userId),
    index().on(t.invitationId),
    check('rsvps_plus_ones_valid', sql`${t.plusOnes} between 0 and 10`),
  ],
);

/** LOG-03 checklist items (table in MVP, UI in V1). */
export const checklists = pgTable(
  'checklists',
  {
    id: id(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    isDone: boolean().notNull().default(false),
    assigneeId: uuid().references(() => users.id, { onDelete: 'set null' }),
    sort: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [index().on(t.eventId, t.sort), index().on(t.assigneeId)],
);
