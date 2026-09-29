/**
 * Integration test on a real Neon branch: event chat and following (ADR 0021).
 * A member asks an organizer a question; nobody else can read it; the reply
 * shows as unread. A private event's group chat is open to hosts and guests
 * who answered, not to others. Following an organizer fills the feed.
 *
 * Run with `pnpm --filter @doulisha/api test:integration` (needs DATABASE_URL,
 * refuses the production branch). It creates its own data and cleans up.
 */
import { createHttpDb, schema } from '@doulisha/db';
import { loadRootEnv, requireEnv } from '@doulisha/db/load-env';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Actor } from '../permissions';
import {
  countUnread,
  getThread,
  listInbox,
  openGroupChat,
  openOrganizerThread,
  sendMessage,
} from '../services/chat';
import { followOrganizer, getFeed, unfollowOrganizer } from '../services/follows';

loadRootEnv();
if (process.env.NEON_BRANCH === 'production') {
  throw new Error('Integration tests must not run against the production branch');
}
const db = createHttpDb(requireEnv('DATABASE_URL'));

const run = `it-chat-${Date.now()}`;
const userIds: string[] = [];
const eventIds: string[] = [];
let organizer: Actor;
let amel: Actor;
let karim: Actor;
let profileId = '';
let publicEventId = '';
let privateEventId = '';

const actor = (userId: string): Actor => ({ userId, roles: ['participant'], isAnonymous: false });

beforeAll(async () => {
  const users = await db
    .insert(schema.users)
    .values(
      ['sami', 'amel', 'karim'].map((name) => ({
        name: `${name} ${run}`,
        email: `${run}-${name}@test.doulisha.invalid`,
      })),
    )
    .returning();
  userIds.push(...users.map((u) => u.id));
  organizer = { ...actor(users[0]!.id), roles: ['participant', 'organizer'] };
  amel = actor(users[1]!.id);
  karim = actor(users[2]!.id);

  const [profile] = await db
    .insert(schema.organizerProfiles)
    .values({
      ownerUserId: organizer.userId,
      slug: run,
      name: `Club ${run}`,
      legalStatus: 'association',
    })
    .returning();
  profileId = profile!.id;

  const [template] = await db
    .select()
    .from(schema.templates)
    .where(eq(schema.templates.key, 'workshop_class'));
  if (!template) throw new Error('Run the seed first (templates are missing)');
  const base = {
    creatorId: organizer.userId,
    organizerProfileId: profileId,
    templateId: template.id,
    categoryId: template.categoryId,
    status: 'published' as const,
    startsAt: new Date(Date.now() + 7 * 86_400_000),
    registrationType: 'free_rsvp' as const,
  };
  const events = await db
    .insert(schema.events)
    .values([
      { ...base, slug: `${run}-public`, title: 'Public', model: 'ticketed', visibility: 'public' },
      {
        ...base,
        slug: `${run}-private`,
        title: 'Private',
        model: 'private',
        visibility: 'private',
      },
    ])
    .returning();
  publicEventId = events[0]!.id;
  privateEventId = events[1]!.id;
  eventIds.push(publicEventId, privateEventId);
  await db
    .insert(schema.rsvps)
    .values({ eventId: privateEventId, userId: amel.userId, status: 'going', guestName: 'Amel' });
});

afterAll(async () => {
  if (eventIds.length) await db.delete(schema.events).where(inArray(schema.events.id, eventIds));
  if (userIds.length) await db.delete(schema.users).where(inArray(schema.users.id, userIds));
});

describe('asking the organizer', () => {
  it('keeps the thread between the member and the organizers', async () => {
    const { conversationId } = await openOrganizerThread(db, amel, publicEventId);
    // Asking again reuses the same thread.
    expect((await openOrganizerThread(db, amel, publicEventId)).conversationId).toBe(
      conversationId,
    );
    await sendMessage(db, amel, conversationId, 'Is there parking nearby?');

    await expect(getThread(db, karim, conversationId)).rejects.toMatchObject({
      messageKey: 'errors.notFound',
    });
    await expect(sendMessage(db, karim, conversationId, 'Hello')).rejects.toMatchObject({
      messageKey: 'errors.notFound',
    });

    expect(await countUnread(db, organizer)).toBe(1);
    const inbox = await listInbox(db, organizer);
    expect(inbox[0]).toMatchObject({ id: conversationId, role: 'organizer', unread: 1 });

    const seen = await getThread(db, organizer, conversationId);
    expect(seen.role).toBe('organizer');
    expect(seen.title).toBe(`amel ${run}`);
    expect(seen.messages.map((m) => m.body)).toEqual(['Is there parking nearby?']);
    expect(await countUnread(db, organizer)).toBe(0);

    await sendMessage(db, organizer, conversationId, 'Yes, right by the entrance.');
    expect(await countUnread(db, amel)).toBe(1);
    const reply = await getThread(db, amel, conversationId);
    expect(reply.title).toBe(`Club ${run}`);
    expect(reply.messages.at(-1)).toMatchObject({ mine: false, fromOrganizer: true });
  });

  it('refuses the organizer their own event and private events', async () => {
    await expect(openOrganizerThread(db, organizer, publicEventId)).rejects.toMatchObject({
      messageKey: 'errors.chatOwnEvent',
    });
    await expect(openOrganizerThread(db, amel, privateEventId)).rejects.toMatchObject({
      messageKey: 'errors.notFound',
    });
  });
});

describe('private event group chat', () => {
  it('is open to the host and guests going, not to others', async () => {
    const { conversationId } = await openGroupChat(db, organizer, privateEventId);
    expect((await openGroupChat(db, amel, privateEventId)).conversationId).toBe(conversationId);
    await expect(openGroupChat(db, karim, privateEventId)).rejects.toMatchObject({
      messageKey: 'errors.forbidden',
    });
    await sendMessage(db, amel, conversationId, 'I bring the cake');
    const thread = await getThread(db, organizer, conversationId);
    expect(thread.kind).toBe('group');
    expect(thread.messages[0]).toMatchObject({ senderName: 'Amel', fromOrganizer: false });
  });
});

describe('following an organizer', () => {
  it('fills the feed with their upcoming public events only', async () => {
    let feed = await getFeed(db, amel, 'fr');
    expect(feed.events.some((e) => e.id === publicEventId)).toBe(false);
    await followOrganizer(db, amel, profileId);
    feed = await getFeed(db, amel, 'fr');
    expect(feed.following.map((o) => o.id)).toContain(profileId);
    expect(feed.events.map((e) => e.id)).toContain(publicEventId);
    expect(feed.events.map((e) => e.id)).not.toContain(privateEventId);
    await unfollowOrganizer(db, amel, profileId);
    expect((await getFeed(db, amel, 'fr')).following.map((o) => o.id)).not.toContain(profileId);
  });

  it('refuses following yourself', async () => {
    await expect(followOrganizer(db, organizer, profileId)).rejects.toMatchObject({
      messageKey: 'errors.cannotFollowSelf',
    });
  });
});
