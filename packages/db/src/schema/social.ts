import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { createdAt, deletedAt, id, timestamps } from './columns';
import {
  conversationKind,
  followTarget,
  friendshipStatus,
  mediaKind,
  reactionKind,
  reactionTarget,
  reportStatus,
  reportTarget,
  storageBucket,
} from './enums';
import { events } from './events';
import { users } from './identity';

/** SOC-02 mutual friendship: one row per pair, in either direction. */
export const friendships = pgTable(
  'friendships',
  {
    requesterId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addresseeId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: friendshipStatus().notNull().default('pending'),
    createdAt: createdAt(),
    respondedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.requesterId, t.addresseeId] }),
    index().on(t.addresseeId),
    uniqueIndex('friendships_pair_unique').using(
      'btree',
      sql`least(${t.requesterId}, ${t.addresseeId})`,
      sql`greatest(${t.requesterId}, ${t.addresseeId})`,
    ),
    check('friendships_not_self', sql`${t.requesterId} <> ${t.addresseeId}`),
  ],
);

/** SOC-01 follow organizers, providers or people. `targetId` points to the matching table. */
export const follows = pgTable(
  'follows',
  {
    followerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetType: followTarget().notNull(),
    targetId: uuid().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.targetType, t.targetId] }),
    index().on(t.targetType, t.targetId),
  ],
);

/** SOC-04 event wall posts (and feed posts when `eventId` is null). */
export const posts = pgTable(
  'posts',
  {
    id: id(),
    authorId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    eventId: uuid().references(() => events.id, { onDelete: 'cascade' }),
    body: text().notNull(),
    ...timestamps(),
    deletedAt: deletedAt(),
  },
  (t) => [index().on(t.authorId), index().on(t.eventId, t.createdAt)],
);

export const comments = pgTable(
  'comments',
  {
    id: id(),
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid(),
    body: text().notNull(),
    ...timestamps(),
    deletedAt: deletedAt(),
  },
  (t) => [index().on(t.postId, t.createdAt), index().on(t.authorId), index().on(t.parentId)],
);

/** SOC-05. */
export const reactions = pgTable(
  'reactions',
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetType: reactionTarget().notNull(),
    targetId: uuid().notNull(),
    kind: reactionKind().notNull().default('like'),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.targetType, t.targetId] }),
    index().on(t.targetType, t.targetId),
  ],
);

/** Photos, videos, GPX tracks and documents stored in R2 (`key` is the object key). */
export const media = pgTable(
  'media',
  {
    id: id(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: mediaKind().notNull(),
    bucket: storageBucket().notNull().default('public'),
    key: text().notNull(),
    width: integer(),
    height: integer(),
    alt: text(),
    eventId: uuid().references(() => events.id, { onDelete: 'cascade' }),
    postId: uuid().references(() => posts.id, { onDelete: 'cascade' }),
    sort: integer().notNull().default(0),
    createdAt: createdAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index().on(t.ownerId), index().on(t.eventId, t.sort), index().on(t.postId)],
);

/** TRS-03 reports, handled in the ADM-02 moderation queue. */
export const reports = pgTable(
  'reports',
  {
    id: id(),
    reporterId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetType: reportTarget().notNull(),
    targetId: uuid().notNull(),
    reason: text().notNull(),
    details: text(),
    status: reportStatus().notNull().default('open'),
    handledBy: uuid().references(() => users.id, { onDelete: 'set null' }),
    handledAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.reporterId),
    index().on(t.handledBy),
    index().on(t.status, t.createdAt),
    index().on(t.targetType, t.targetId),
  ],
);

/** TRS-03 block users. */
export const blocks = pgTable(
  'blocks',
  {
    blockerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] }), index().on(t.blockedId)],
);

/**
 * Event chat (ADR 0021). `organizer`: one private thread per participant
 * (`memberId`) with the event's organizers (COM-05). `group`: one chat per
 * private event for hosts and guests (COM-06), `memberId` null.
 */
export const conversations = pgTable(
  'conversations',
  {
    id: id(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    kind: conversationKind().notNull(),
    memberId: uuid().references(() => users.id, { onDelete: 'cascade' }),
    lastMessageAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('conversations_organizer_unique')
      .on(t.eventId, t.memberId)
      .where(sql`${t.kind} = 'organizer'`),
    uniqueIndex('conversations_group_unique')
      .on(t.eventId)
      .where(sql`${t.kind} = 'group'`),
    index().on(t.memberId),
    check(
      'conversations_member_matches_kind',
      sql`(${t.kind} = 'organizer') = (${t.memberId} is not null)`,
    ),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: id(),
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.conversationId, t.createdAt),
    index().on(t.senderId, t.createdAt),
    check('messages_body_length', sql`char_length(${t.body}) between 1 and 2000`),
  ],
);

/** Where each person stopped reading, for unread counts. */
export const conversationReads = pgTable(
  'conversation_reads',
  {
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lastReadAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.userId] })],
);
