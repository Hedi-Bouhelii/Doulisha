import { randomBytes } from 'node:crypto';

import type { Executor } from '@doulisha/db';
import { schema } from '@doulisha/db';
import type { Locale } from '@doulisha/i18n';
import { localizeBrief } from '@doulisha/templates';
import type { quickPrivateEventSchema, rsvpInputSchema } from '@doulisha/validators';
import { and, asc, eq } from 'drizzle-orm';
import type { z } from 'zod';

import type { ServiceDeps } from '../deps';
import { makeSlug } from '../domain/slug';
import { AppError } from '../errors';
import type { Actor } from '../permissions';
import { loadManagedEvent } from './event-editor';
import { coverUrlFromKey } from './uploads';

/** Unguessable token for invitation links (INV-02). */
export function invitationToken() {
  return randomBytes(12).toString('base64url');
}

/**
 * INV-01: a private event in one step (title, date, place, cover), published
 * at once with a shareable invitation link. Private events are never listed.
 */
export async function createQuickPrivateEvent(
  db: Executor,
  deps: Pick<ServiceDeps, 'storage'>,
  actor: Actor,
  input: z.infer<typeof quickPrivateEventSchema>,
  locale: Locale,
) {
  if (input.startsAt <= new Date()) throw new AppError('BAD_REQUEST', 'errors.dateInPast');
  const [template] = await db
    .select()
    .from(schema.templates)
    .where(eq(schema.templates.key, input.templateKey));
  if (!template) throw new AppError('NOT_FOUND', 'errors.notFound');
  const [event] = await db
    .insert(schema.events)
    .values({
      slug: makeSlug(input.title),
      creatorId: actor.userId,
      templateId: template.id,
      categoryId: template.categoryId,
      model: 'private',
      status: 'published',
      visibility: 'private',
      title: input.title,
      description: input.description ?? null,
      language: locale,
      coverUrl: input.coverKey ? coverUrlFromKey(deps, actor, input.coverKey) : null,
      startsAt: input.startsAt,
      venueName: input.venueName ?? null,
      city: input.city ?? null,
      locationHiddenUntilBooking: input.locationHiddenUntilBooking,
      registrationType: 'free_rsvp',
      cancellationPolicy: 'flexible',
      brief: localizeBrief(template.definition.defaultBrief, locale),
      publishedAt: new Date(),
    })
    .returning();
  const token = invitationToken();
  await db.insert(schema.invitations).values({
    eventId: event!.id,
    invitedById: actor.userId,
    channel: 'link',
    token,
  });
  // The host is on the guest list as "going".
  await db.insert(schema.rsvps).values({
    eventId: event!.id,
    userId: actor.userId,
    status: 'going',
    respondedAt: new Date(),
  });
  return { eventId: event!.id, token };
}

/** The link invitation of an event (created on demand) for the host to share. */
export async function getOrCreateLinkInvitation(db: Executor, actor: Actor, eventId: string) {
  await loadManagedEvent(db, actor, eventId);
  const [existing] = await db
    .select()
    .from(schema.invitations)
    .where(and(eq(schema.invitations.eventId, eventId), eq(schema.invitations.channel, 'link')))
    .limit(1);
  if (existing) return { token: existing.token };
  const token = invitationToken();
  await db
    .insert(schema.invitations)
    .values({ eventId, invitedById: actor.userId, channel: 'link', token });
  return { token };
}

async function loadInvitation(db: Executor, token: string) {
  const [row] = await db
    .select({
      invitation: schema.invitations,
      event: schema.events,
      hostName: schema.users.name,
    })
    .from(schema.invitations)
    .innerJoin(schema.events, eq(schema.events.id, schema.invitations.eventId))
    .innerJoin(schema.users, eq(schema.users.id, schema.events.creatorId))
    .where(eq(schema.invitations.token, token))
    .limit(1);
  if (!row || row.event.deletedAt) throw new AppError('NOT_FOUND', 'errors.notFound');
  return row;
}

async function guestList(db: Executor, eventId: string) {
  return db
    .select({
      name: schema.users.name,
      guestName: schema.rsvps.guestName,
      image: schema.users.image,
      status: schema.rsvps.status,
      plusOnes: schema.rsvps.plusOnes,
      dietaryNotes: schema.rsvps.dietaryNotes,
    })
    .from(schema.rsvps)
    .innerJoin(schema.users, eq(schema.users.id, schema.rsvps.userId))
    .where(eq(schema.rsvps.eventId, eventId))
    .orderBy(asc(schema.rsvps.respondedAt));
}

/**
 * INV-02: the invitation page. Anyone with the link sees the invitation; the
 * guest list is shown only to the host and to guests who answered (TRS-06),
 * and dietary notes only to the host. The address stays hidden until the
 * guest says they are going, when the host chose so.
 */
export async function getInvitation(db: Executor, actor: Actor | null, token: string) {
  const { invitation, event, hostName } = await loadInvitation(db, token);
  if (invitation.seenAt === null && actor && actor.userId !== event.creatorId) {
    await db
      .update(schema.invitations)
      .set({ seenAt: new Date() })
      .where(eq(schema.invitations.id, invitation.id));
  }
  const [mine] = actor
    ? await db
        .select()
        .from(schema.rsvps)
        .where(and(eq(schema.rsvps.eventId, event.id), eq(schema.rsvps.userId, actor.userId)))
        .limit(1)
    : [];
  const isHost = actor?.userId === event.creatorId;
  const answered = Boolean(mine) || isHost;
  const guests = answered ? await guestList(db, event.id) : [];
  const counts = { going: 0, maybe: 0, notGoing: 0 };
  for (const g of answered ? guests : await guestList(db, event.id)) {
    if (g.status === 'going') counts.going += 1 + g.plusOnes;
    if (g.status === 'maybe') counts.maybe += 1;
    if (g.status === 'not_going') counts.notGoing += 1;
  }
  const showAddress = !event.locationHiddenUntilBooking || isHost || mine?.status === 'going';
  return {
    eventId: event.id,
    title: event.title,
    description: event.description,
    coverUrl: event.coverUrl,
    startsAt: event.startsAt,
    venueName: showAddress ? event.venueName : null,
    address: showAddress ? event.address : null,
    city: event.city,
    status: event.status,
    hostName,
    isHost,
    myRsvp: mine
      ? {
          status: mine.status,
          plusOnes: mine.plusOnes,
          dietaryNotes: mine.dietaryNotes,
          guestName: mine.guestName,
        }
      : null,
    counts,
    guests: guests.map((g) => ({
      name: g.guestName ?? g.name,
      image: g.image,
      status: g.status,
      plusOnes: g.plusOnes,
      dietaryNotes: isHost ? g.dietaryNotes : null,
    })),
  };
}

/**
 * INV-03: answer an invitation (going, maybe, not going, +1s, dietary notes).
 * Works for guests without an account through an anonymous session.
 */
export async function respondToInvitation(
  db: Executor,
  actor: Actor | null,
  input: z.infer<typeof rsvpInputSchema>,
) {
  if (!actor) throw new AppError('UNAUTHORIZED', 'errors.signInRequired');
  const { invitation, event } = await loadInvitation(db, input.token);
  if (event.status === 'cancelled' || event.startsAt < new Date()) {
    throw new AppError('BAD_REQUEST', 'errors.eventNotBookable');
  }
  if (actor.isAnonymous && !input.guestName) {
    throw new AppError('BAD_REQUEST', 'errors.nameRequired');
  }
  await db
    .insert(schema.rsvps)
    .values({
      eventId: event.id,
      userId: actor.userId,
      invitationId: invitation.id,
      guestName: actor.isAnonymous ? (input.guestName ?? null) : null,
      status: input.status,
      plusOnes: input.status === 'going' ? input.plusOnes : 0,
      dietaryNotes: input.dietaryNotes ?? null,
      respondedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [schema.rsvps.eventId, schema.rsvps.userId],
      set: {
        status: input.status,
        plusOnes: input.status === 'going' ? input.plusOnes : 0,
        dietaryNotes: input.dietaryNotes ?? null,
        ...(actor.isAnonymous && input.guestName ? { guestName: input.guestName } : {}),
        respondedAt: new Date(),
      },
    });
}

/** The host's private events with their invitation link token. */
export async function listHostedPrivateEvents(db: Executor, actor: Actor) {
  return db
    .select({
      id: schema.events.id,
      title: schema.events.title,
      startsAt: schema.events.startsAt,
      status: schema.events.status,
      coverUrl: schema.events.coverUrl,
      token: schema.invitations.token,
    })
    .from(schema.events)
    .leftJoin(
      schema.invitations,
      and(eq(schema.invitations.eventId, schema.events.id), eq(schema.invitations.channel, 'link')),
    )
    .where(and(eq(schema.events.creatorId, actor.userId), eq(schema.events.visibility, 'private')))
    .orderBy(asc(schema.events.startsAt));
}
