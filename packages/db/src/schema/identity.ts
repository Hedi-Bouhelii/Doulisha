import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { createdAt, deletedAt, id, timestamps } from './columns';
import {
  inviteAudience,
  legalStatus,
  locale,
  notificationChannel,
  profileVisibility,
  providerType,
  reviewStatus,
  userRole,
  verificationDocument,
} from './enums';

// --- Better Auth core tables (ADR 0010) --------------------------------------
// Property names are the ones Better Auth expects; columns are snake_case.

export const users = pgTable(
  'users',
  {
    id: id(),
    name: text().notNull(),
    /** Phone-only accounts get a placeholder address on the `.invalid` TLD. */
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    /** E.164, e.g. +21620123456 (phoneNumber plugin). */
    phoneNumber: text().unique(),
    phoneNumberVerified: boolean().notNull().default(false),
    /** Guests who RSVP without an account (anonymous plugin). */
    isAnonymous: boolean().notNull().default(false),
    ...timestamps(),
  },
  (t) => [index().on(t.createdAt)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    ...timestamps(),
  },
  (t) => [index().on(t.userId)],
);

export const accounts = pgTable(
  'accounts',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: text().notNull(),
    providerId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...timestamps(),
  },
  (t) => [index().on(t.userId), uniqueIndex().on(t.providerId, t.accountId)],
);

/** Better Auth "verification" model: OTP codes and magic-link tokens. */
export const authTokens = pgTable(
  'auth_tokens',
  {
    id: id(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps(),
  },
  (t) => [index().on(t.identifier)],
);

// --- Roles and profiles -------------------------------------------------------

/** ACC-05: one account, several roles. Everyone is implicitly a participant. */
export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: userRole().notNull(),
    grantedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.role] })],
);

/** ACC-02 personal profile and ACC-06 privacy settings. */
export const profiles = pgTable('profiles', {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  username: text().unique(),
  bio: text(),
  city: text(),
  locale: locale().notNull().default('fr'),
  /** Category slugs. */
  interests: text()
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  birthday: date(),
  /** e.g. { "padel": 4 } on a 1–7 scale. */
  sportLevels: jsonb().$type<Record<string, number>>().notNull().default({}),
  coverUrl: text(),
  visibility: profileVisibility().notNull().default('public'),
  whoCanInvite: inviteAudience().notNull().default('everyone'),
  attendanceVisibility: profileVisibility().notNull().default('friends'),
  ...timestamps(),
});

/**
 * ACC-02 private emergency contact and medical notes, kept apart from the
 * profile with strict access. Medical notes are stored encrypted by the app.
 */
export const profileSensitive = pgTable('profile_sensitive', {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  emergencyContactName: text(),
  emergencyContactPhone: text(),
  medicalNotesCiphertext: text(),
  consentedAt: timestamp({ withTimezone: true }),
  ...timestamps(),
});

/** ACC-03. */
export const organizerProfiles = pgTable(
  'organizer_profiles',
  {
    id: id(),
    ownerUserId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    slug: text().notNull().unique(),
    name: text().notNull(),
    logoUrl: text(),
    coverUrl: text(),
    bio: text(),
    categories: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    regions: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    socialLinks: jsonb().$type<Record<string, string>>().notNull().default({}),
    legalStatus: legalStatus().notNull(),
    verifiedAt: timestamp({ withTimezone: true }),
    ...timestamps(),
    deletedAt: deletedAt(),
  },
  (t) => [index().on(t.ownerUserId)],
);

/** PRV-01 / PRV-02 provider directory. */
export const providerProfiles = pgTable(
  'provider_profiles',
  {
    id: id(),
    ownerUserId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    slug: text().notNull().unique(),
    name: text().notNull(),
    type: providerType().notNull(),
    city: text().notNull(),
    bio: text(),
    logoUrl: text(),
    /** Indicative price range shown in the directory. */
    priceMinMillimes: integer(),
    priceMaxMillimes: integer(),
    phone: text(),
    whatsapp: text(),
    verifiedAt: timestamp({ withTimezone: true }),
    ...timestamps(),
    deletedAt: deletedAt(),
  },
  (t) => [index().on(t.ownerUserId), index().on(t.type, t.city)],
);

/** ACC-04 verification requests; files live in the private bucket. */
export const verifications = pgTable(
  'verifications',
  {
    id: id(),
    organizerProfileId: uuid().references(() => organizerProfiles.id, { onDelete: 'cascade' }),
    providerProfileId: uuid().references(() => providerProfiles.id, { onDelete: 'cascade' }),
    documentType: verificationDocument().notNull(),
    fileKey: text().notNull(),
    status: reviewStatus().notNull().default('pending'),
    reviewedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp({ withTimezone: true }),
    notes: text(),
    ...timestamps(),
  },
  (t) => [
    index().on(t.organizerProfileId),
    index().on(t.providerProfileId),
    index().on(t.reviewedBy),
    index().on(t.status),
  ],
);

/** COM-04 per type and channel (table in MVP, settings UI in V1). */
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text().notNull(),
    channel: notificationChannel().notNull(),
    enabled: boolean().notNull().default(true),
    updatedAt: timestamps().updatedAt,
  },
  (t) => [primaryKey({ columns: [t.userId, t.type, t.channel] })],
);
