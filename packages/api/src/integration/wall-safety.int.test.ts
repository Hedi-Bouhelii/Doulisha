/**
 * Integration test on a real Neon branch: event wall, report and block,
 * privacy settings, and private-event privacy (ADR 0022, TRS-03, TRS-06).
 *
 * Run with `pnpm --filter @doulisha/api test:integration` (needs DATABASE_URL,
 * refuses the production branch). It creates its own data and cleans up.
 */
import { createHttpDb, schema } from '@doulisha/db';
import { loadRootEnv, requireEnv } from '@doulisha/db/load-env';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ServiceDeps } from '../deps';
import type { Actor } from '../permissions';
import { blockUser, unblockUser } from '../services/blocks';
import { getThread, openOrganizerThread, sendMessage } from '../services/chat';
import { listSitemapEvents, listUpcomingPublicEvents } from '../services/events';
import { followOrganizer, getFeed } from '../services/follows';
import { getMemberProfile, updatePrivacy } from '../services/members';
import { createReport } from '../services/reports';
import { addComment, createPost, listWall, react, removePost } from '../services/wall';

loadRootEnv();
if (process.env.NEON_BRANCH === 'production') {
  throw new Error('Integration tests must not run against the production branch');
}
const db = createHttpDb(requireEnv('DATABASE_URL'));
const deps: Pick<ServiceDeps, 'storage'> = {
  storage: {
    id: 'local',
    createUpload: () => Promise.reject(new Error('unused')),
    publicUrl: (key) => `/uploads/${key}`,
  },
};

const run = `it-wall-${Date.now()}`;
const userIds: string[] = [];
const eventIds: string[] = [];
let organizer: Actor;
let amel: Actor;
let karim: Actor;
let profileId = '';
let publicEventId = '';
let privateEventId = '';
let unlistedEventId = '';

const member = (userId: string): Actor => ({ userId, roles: ['participant'], isAnonymous: false });

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
  organizer = { ...member(users[0]!.id), roles: ['participant', 'organizer'] };
  amel = member(users[1]!.id);
  karim = member(users[2]!.id);
  await db.insert(schema.profiles).values(userIds.map((userId) => ({ userId })));

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
    model: 'ticketed' as const,
  };
  const events = await db
    .insert(schema.events)
    .values([
      { ...base, slug: `${run}-public`, title: `Wall ${run}`, visibility: 'public' },
      {
        ...base,
        slug: `${run}-private`,
        title: `Secret ${run}`,
        visibility: 'private',
        model: 'private',
      },
      { ...base, slug: `${run}-unlisted`, title: `Hidden ${run}`, visibility: 'unlisted' },
    ])
    .returning();
  [publicEventId, privateEventId, unlistedEventId] = events.map((e) => e.id) as [
    string,
    string,
    string,
  ];
  eventIds.push(publicEventId, privateEventId, unlistedEventId);
  await db.insert(schema.orders).values({
    eventId: publicEventId,
    buyerId: amel.userId,
    status: 'paid',
    reference: run,
    totalMillimes: 0,
  });
});

afterAll(async () => {
  if (eventIds.length) {
    await db.delete(schema.orders).where(inArray(schema.orders.eventId, eventIds));
    await db.delete(schema.events).where(inArray(schema.events.id, eventIds));
  }
  if (userIds.length) {
    await db.delete(schema.reports).where(inArray(schema.reports.reporterId, userIds));
    await db.delete(schema.users).where(inArray(schema.users.id, userIds));
  }
});

describe('event wall', () => {
  it('lets members post, comment and react, and organizers remove posts', async () => {
    const { id: postId } = await createPost(db, amel, {
      eventId: publicEventId,
      body: 'Who shares a car from Tunis?',
      photoKeys: [],
    });
    await addComment(db, karim, { postId, body: 'Me, 2 seats left' });
    await react(db, organizer, { targetType: 'post', targetId: postId, kind: 'like' });
    await react(db, karim, { targetType: 'post', targetId: postId, kind: 'fire' });
    await react(db, karim, { targetType: 'post', targetId: postId, kind: 'like' });

    const wall = await listWall(db, deps, karim, publicEventId);
    const post = wall.posts.find((p) => p.id === postId)!;
    expect(post.comments.map((c) => c.body)).toEqual(['Me, 2 seats left']);
    expect(post.reactions).toMatchObject({ counts: { like: 2 }, mine: 'like', total: 2 });
    expect(post.canRemove).toBe(false);
    expect((await listWall(db, deps, organizer, publicEventId)).posts[0]!.canRemove).toBe(true);

    await expect(removePost(db, karim, postId)).rejects.toMatchObject({
      messageKey: 'errors.forbidden',
    });
    await removePost(db, organizer, postId);
    expect((await listWall(db, deps, null, publicEventId)).posts).toEqual([]);
  });

  it('refuses photos uploaded by someone else, and anonymous visitors', async () => {
    await expect(
      createPost(db, amel, {
        eventId: publicEventId,
        body: 'Look',
        photoKeys: [`post-photo/${karim.userId}/x.jpg`],
      }),
    ).rejects.toMatchObject({ messageKey: 'errors.forbidden' });
    await expect(
      createPost(db, null, { eventId: publicEventId, body: 'Hi', photoKeys: [] }),
    ).rejects.toMatchObject({ messageKey: 'errors.signInRequired' });
  });

  it('does not exist on private events', async () => {
    await expect(listWall(db, deps, organizer, privateEventId)).rejects.toMatchObject({
      messageKey: 'errors.notFound',
    });
  });
});

describe('block and report', () => {
  it('hides a blocked member’s posts and stops their messages', async () => {
    const { id: postId } = await createPost(db, karim, {
      eventId: publicEventId,
      body: `Spam ${run}`,
      photoKeys: [],
    });
    await blockUser(db, amel, karim.userId);
    expect((await listWall(db, deps, amel, publicEventId)).posts.map((p) => p.id)).not.toContain(
      postId,
    );
    expect((await listWall(db, deps, organizer, publicEventId)).posts.map((p) => p.id)).toContain(
      postId,
    );
    await expect(addComment(db, karim, { postId: postId, body: 'x' })).resolves.toBeTruthy();

    // An organizer who blocks a participant no longer receives their messages.
    await blockUser(db, organizer, karim.userId);
    await expect(openOrganizerThread(db, karim, publicEventId)).rejects.toMatchObject({
      messageKey: 'errors.cannotMessage',
    });
    await unblockUser(db, organizer, karim.userId);
    const { conversationId } = await openOrganizerThread(db, karim, publicEventId);
    await sendMessage(db, karim, conversationId, 'Hello');
    await blockUser(db, organizer, karim.userId);
    await expect(sendMessage(db, karim, conversationId, 'Hello again')).rejects.toMatchObject({
      messageKey: 'errors.cannotMessage',
    });
    expect((await getThread(db, organizer, conversationId)).messages).toEqual([]);
    await unblockUser(db, organizer, karim.userId);
    await unblockUser(db, amel, karim.userId);
  });

  it('stores one open report per person and target', async () => {
    const first = await createReport(db, amel, {
      targetType: 'event',
      targetId: publicEventId,
      reason: 'scam',
      details: 'Asks for payment by transfer to a personal account',
    });
    const again = await createReport(db, amel, {
      targetType: 'event',
      targetId: publicEventId,
      reason: 'scam',
    });
    expect(again.id).toBe(first.id);
    await expect(
      createReport(db, amel, { targetType: 'user', targetId: crypto.randomUUID(), reason: 'spam' }),
    ).rejects.toMatchObject({ messageKey: 'errors.notFound' });
  });
});

describe('privacy', () => {
  it('shows attended events only when the member allows it', async () => {
    let profile = await getMemberProfile(db, 'fr', karim, amel.userId);
    expect(profile.isPrivate).toBe(false);
    if (!profile.isPrivate) {
      expect(profile.showAttending).toBe(false);
      expect(profile.attending).toEqual([]);
    }
    await updatePrivacy(db, amel, { visibility: 'public', attendanceVisibility: 'public' });
    profile = await getMemberProfile(db, 'fr', karim, amel.userId);
    if (!profile.isPrivate) {
      expect(profile.attending.map((e) => e.id)).toEqual([publicEventId]);
    }
    await updatePrivacy(db, amel, { visibility: 'private', attendanceVisibility: 'public' });
    profile = await getMemberProfile(db, 'fr', karim, amel.userId);
    expect(profile.isPrivate).toBe(true);
    // The member still sees everything on their own page.
    expect((await getMemberProfile(db, 'fr', amel, amel.userId)).isPrivate).toBe(false);
  });

  it('never lists private or unlisted events in search, the feed or the sitemap (TRS-06)', async () => {
    const listed = (
      await listUpcomingPublicEvents(db, 'fr', { limit: 100, organizerProfileId: profileId })
    ).map((e) => e.id);
    expect(listed).toEqual([publicEventId]);
    const searched = (await listUpcomingPublicEvents(db, 'fr', { limit: 100, query: run })).map(
      (e) => e.id,
    );
    expect(searched).toEqual([publicEventId]);
    await followOrganizer(db, amel, profileId);
    const feed = (await getFeed(db, amel, 'fr')).events.map((e) => e.id);
    expect(feed).toContain(publicEventId);
    expect(feed).not.toContain(privateEventId);
    expect(feed).not.toContain(unlistedEventId);
    const sitemap = (await listSitemapEvents(db)).map((e) => e.slug);
    expect(sitemap).toContain(`${run}-public`);
    expect(sitemap).not.toContain(`${run}-private`);
    expect(sitemap).not.toContain(`${run}-unlisted`);
  });
});
