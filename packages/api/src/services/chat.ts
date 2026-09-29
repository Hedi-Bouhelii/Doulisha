import type { Executor } from '@doulisha/db';
import { schema } from '@doulisha/db';
import { and, desc, eq, gt, inArray, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import {
  chatRole,
  GROUP_RSVP_STATUSES,
  MESSAGE_MAX_LENGTH,
  MESSAGES_PER_MINUTE,
  THREAD_PAGE,
  type ChatRole,
} from '../domain/chat-access';
import { AppError } from '../errors';
import { canManageEvent, type Actor } from '../permissions';

const c = schema.conversations;
const m = schema.messages;

async function loadEvent(db: Executor, eventId: string) {
  const [row] = await db
    .select({
      id: schema.events.id,
      title: schema.events.title,
      slug: schema.events.slug,
      startsAt: schema.events.startsAt,
      status: schema.events.status,
      visibility: schema.events.visibility,
      creatorId: schema.events.creatorId,
      organizerOwnerId: schema.organizerProfiles.ownerUserId,
      organizerName: schema.organizerProfiles.name,
    })
    .from(schema.events)
    .leftJoin(
      schema.organizerProfiles,
      eq(schema.organizerProfiles.id, schema.events.organizerProfileId),
    )
    .where(and(eq(schema.events.id, eventId), sql`${schema.events.deletedAt} is null`));
  if (!row) throw new AppError('NOT_FOUND', 'errors.notFound');
  return row;
}
type ChatEvent = Awaited<ReturnType<typeof loadEvent>>;

async function hasGroupRsvp(db: Executor, eventId: string, userId: string) {
  const [row] = await db
    .select({ id: schema.rsvps.id })
    .from(schema.rsvps)
    .where(
      and(
        eq(schema.rsvps.eventId, eventId),
        eq(schema.rsvps.userId, userId),
        inArray(schema.rsvps.status, [...GROUP_RSVP_STATUSES]),
      ),
    )
    .limit(1);
  return Boolean(row);
}

function managesEvent(actor: Actor, event: ChatEvent) {
  return canManageEvent(actor, {
    creatorId: event.creatorId,
    organizerOwnerId: event.organizerOwnerId,
  });
}

async function findOrCreate(
  db: Executor,
  values: { eventId: string; kind: 'organizer' | 'group'; memberId: string | null },
) {
  await db.insert(c).values(values).onConflictDoNothing();
  const [conversation] = await db
    .select({ id: c.id })
    .from(c)
    .where(
      and(
        eq(c.eventId, values.eventId),
        eq(c.kind, values.kind),
        values.memberId ? eq(c.memberId, values.memberId) : sql`${c.memberId} is null`,
      ),
    );
  return conversation!.id;
}

/**
 * COM-05: a member's private thread with the organizers of a public or
 * unlisted event ("Ask the organizer"). Created on first use.
 */
export async function openOrganizerThread(db: Executor, actor: Actor, eventId: string) {
  const event = await loadEvent(db, eventId);
  if (event.visibility === 'private' || !['published', 'full'].includes(event.status)) {
    throw new AppError('NOT_FOUND', 'errors.notFound');
  }
  if (managesEvent(actor, event)) throw new AppError('BAD_REQUEST', 'errors.chatOwnEvent');
  return {
    conversationId: await findOrCreate(db, { eventId, kind: 'organizer', memberId: actor.userId }),
  };
}

/** COM-06: the group chat of a private event, for hosts and guests going or maybe. */
export async function openGroupChat(db: Executor, actor: Actor, eventId: string) {
  const event = await loadEvent(db, eventId);
  if (event.visibility !== 'private') throw new AppError('NOT_FOUND', 'errors.notFound');
  const role = chatRole(actor.userId, {
    kind: 'group',
    memberId: null,
    managesEvent: managesEvent(actor, event),
    hasGroupRsvp: await hasGroupRsvp(db, eventId, actor.userId),
  });
  if (!role) throw new AppError('FORBIDDEN', 'errors.forbidden');
  return { conversationId: await findOrCreate(db, { eventId, kind: 'group', memberId: null }) };
}

async function requireAccess(db: Executor, actor: Actor, conversationId: string) {
  const [conversation] = await db.select().from(c).where(eq(c.id, conversationId));
  if (!conversation) throw new AppError('NOT_FOUND', 'errors.notFound');
  const event = await loadEvent(db, conversation.eventId);
  const role = chatRole(actor.userId, {
    kind: conversation.kind,
    memberId: conversation.memberId,
    managesEvent: managesEvent(actor, event),
    hasGroupRsvp:
      conversation.kind === 'group' ? await hasGroupRsvp(db, event.id, actor.userId) : false,
  });
  // Not found rather than forbidden: nobody learns that a conversation exists.
  if (!role) throw new AppError('NOT_FOUND', 'errors.notFound');
  return { conversation, event, role };
}

async function markRead(db: Executor, conversationId: string, userId: string, at: Date) {
  await db
    .insert(schema.conversationReads)
    .values({ conversationId, userId, lastReadAt: at })
    .onConflictDoUpdate({
      target: [schema.conversationReads.conversationId, schema.conversationReads.userId],
      set: { lastReadAt: at },
    });
}

/**
 * A conversation with its latest messages, oldest first; reading it marks it
 * read. The web app polls this while the chat is open (ADR 0021).
 */
export async function getThread(
  db: Executor,
  actor: Actor,
  conversationId: string,
  now = new Date(),
) {
  const { conversation, event, role } = await requireAccess(db, actor, conversationId);
  const rows = await db
    .select({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      senderId: m.senderId,
      senderName: schema.users.name,
      guestName: schema.rsvps.guestName,
    })
    .from(m)
    .innerJoin(schema.users, eq(schema.users.id, m.senderId))
    .leftJoin(
      schema.rsvps,
      and(eq(schema.rsvps.eventId, event.id), eq(schema.rsvps.userId, m.senderId)),
    )
    .where(eq(m.conversationId, conversationId))
    .orderBy(desc(m.createdAt))
    .limit(THREAD_PAGE);

  let title = event.title;
  if (conversation.kind === 'organizer') {
    if (role === 'member') {
      title = event.organizerName ?? event.title;
    } else {
      const [member] = await db
        .select({ name: schema.users.name })
        .from(schema.users)
        .where(eq(schema.users.id, conversation.memberId!));
      title = member?.name ?? event.title;
    }
  }
  await markRead(db, conversationId, actor.userId, now);

  const organizers = new Set([event.creatorId, event.organizerOwnerId].filter(Boolean));
  return {
    id: conversation.id,
    kind: conversation.kind,
    role,
    title,
    event: { id: event.id, title: event.title, slug: event.slug, startsAt: event.startsAt },
    messages: rows.reverse().map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      mine: row.senderId === actor.userId,
      fromOrganizer: organizers.has(row.senderId),
      senderName: row.guestName ?? row.senderName,
    })),
  };
}

/** Sends a message (at most MESSAGES_PER_MINUTE a minute per person). */
export async function sendMessage(
  db: Executor,
  actor: Actor,
  conversationId: string,
  body: string,
  now = new Date(),
) {
  const text = body.trim();
  if (!text || text.length > MESSAGE_MAX_LENGTH) {
    throw new AppError('BAD_REQUEST', 'errors.messageLength');
  }
  await requireAccess(db, actor, conversationId);
  const [recent] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(m)
    .where(and(eq(m.senderId, actor.userId), gt(m.createdAt, new Date(now.getTime() - 60_000))));
  if ((recent?.count ?? 0) >= MESSAGES_PER_MINUTE) {
    throw new AppError('TOO_MANY_REQUESTS', 'errors.tooManyMessages');
  }
  const [message] = await db
    .insert(m)
    .values({ conversationId, senderId: actor.userId, body: text, createdAt: now })
    .returning({ id: m.id, createdAt: m.createdAt });
  await db.update(c).set({ lastMessageAt: now }).where(eq(c.id, conversationId));
  await markRead(db, conversationId, actor.userId, now);
  return message!;
}

/** Conversations the actor belongs to (see chatRole); organizer threads only once they have messages. */
function inboxCondition(actor: Actor): SQL {
  const manages = sql`(${schema.events.creatorId} = ${actor.userId} or ${schema.organizerProfiles.ownerUserId} = ${actor.userId})`;
  const going = sql`exists (select 1 from ${schema.rsvps} where ${schema.rsvps.eventId} = ${c.eventId} and ${schema.rsvps.userId} = ${actor.userId} and ${schema.rsvps.status} in ('going', 'maybe'))`;
  return or(
    and(eq(c.kind, 'organizer'), eq(c.memberId, actor.userId)),
    and(eq(c.kind, 'organizer'), manages, sql`${c.lastMessageAt} is not null`),
    and(eq(c.kind, 'group'), or(manages, going)),
  )!;
}

function unreadCount(actor: Actor) {
  return sql<number>`(select count(*)::int from ${m} where ${m.conversationId} = ${c.id} and ${m.senderId} <> ${actor.userId} and ${m.createdAt} > coalesce((select ${schema.conversationReads.lastReadAt} from ${schema.conversationReads} where ${schema.conversationReads.conversationId} = ${c.id} and ${schema.conversationReads.userId} = ${actor.userId}), 'epoch'::timestamptz))`;
}

/** "Messages": every conversation of the actor, latest first, with unread counts. */
export async function listInbox(db: Executor, actor: Actor) {
  const member = alias(schema.users, 'member');
  const rows = await db
    .select({
      id: c.id,
      kind: c.kind,
      memberId: c.memberId,
      memberName: member.name,
      eventTitle: schema.events.title,
      eventSlug: schema.events.slug,
      organizerName: schema.organizerProfiles.name,
      lastMessageAt: c.lastMessageAt,
      lastMessage: sql<
        string | null
      >`(select ${m.body} from ${m} where ${m.conversationId} = ${c.id} order by ${m.createdAt} desc limit 1)`,
      unread: unreadCount(actor),
    })
    .from(c)
    .innerJoin(schema.events, eq(schema.events.id, c.eventId))
    .leftJoin(
      schema.organizerProfiles,
      eq(schema.organizerProfiles.id, schema.events.organizerProfileId),
    )
    .leftJoin(member, eq(member.id, c.memberId))
    .where(and(inboxCondition(actor), sql`${schema.events.deletedAt} is null`))
    .orderBy(desc(sql`coalesce(${c.lastMessageAt}, ${c.createdAt})`))
    .limit(50);
  return rows.map((row) => {
    const asMember = row.kind === 'organizer' && row.memberId === actor.userId;
    const role: ChatRole = asMember || row.kind === 'group' ? 'member' : 'organizer';
    return {
      id: row.id,
      kind: row.kind,
      role,
      title:
        row.kind === 'group'
          ? row.eventTitle
          : asMember
            ? (row.organizerName ?? row.eventTitle)
            : (row.memberName ?? row.eventTitle),
      eventTitle: row.eventTitle,
      eventSlug: row.eventSlug,
      lastMessage: row.lastMessage,
      lastMessageAt: row.lastMessageAt,
      unread: row.unread,
    };
  });
}

/** Unread messages across all conversations, for the badge in the menu. */
export async function countUnread(db: Executor, actor: Actor) {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${unreadCount(actor)}), 0)::int` })
    .from(c)
    .innerJoin(schema.events, eq(schema.events.id, c.eventId))
    .leftJoin(
      schema.organizerProfiles,
      eq(schema.organizerProfiles.id, schema.events.organizerProfileId),
    )
    .where(and(inboxCondition(actor), sql`${schema.events.deletedAt} is null`));
  return row?.total ?? 0;
}
