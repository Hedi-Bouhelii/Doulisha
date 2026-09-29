/**
 * Integration test on a real Neon branch (BUILD_PROMPT section 5):
 * 50 parallel purchases for 10 places must never oversell.
 *
 * Run with `pnpm --filter @doulisha/api test:integration` (needs DATABASE_URL,
 * refuses the production branch). It creates its own event and cleans up.
 */
import { createHttpDb, schema, withTransaction } from '@doulisha/db';
import { loadRootEnv, requireEnv } from '@doulisha/db/load-env';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ServiceDeps } from '../deps';
import { AppError } from '../errors';
import type { Actor } from '../permissions';
import { createBooking } from '../services/booking';

loadRootEnv();
if (process.env.NEON_BRANCH === 'production') {
  throw new Error('Integration tests must not run against the production branch');
}
const url = requireEnv('DATABASE_URL');
const db = createHttpDb(url);

const deps: ServiceDeps = {
  transaction: (fn) => withTransaction(url, fn),
  payments: {},
  storage: {
    id: 'local',
    createUpload: () => Promise.reject(new Error('unused')),
    publicUrl: (k) => k,
  },
  appUrl: 'http://localhost:3000',
};

const run = `it-${Date.now()}`;
let userId = '';
const eventIds: string[] = [];

async function createEvent(waitlistEnabled: boolean) {
  const [template] = await db
    .select()
    .from(schema.templates)
    .where(eq(schema.templates.key, 'workshop_class'));
  if (!template) throw new Error('Run the seed first (templates are missing)');
  const [event] = await db
    .insert(schema.events)
    .values({
      slug: `${run}-${waitlistEnabled ? 'wl' : 'no-wl'}`,
      creatorId: userId,
      templateId: template.id,
      categoryId: template.categoryId,
      model: 'ticketed',
      status: 'published',
      title: 'Concurrency test',
      startsAt: new Date(Date.now() + 7 * 86_400_000),
      capacity: 10,
      waitlistEnabled,
      registrationType: 'free_rsvp',
    })
    .returning();
  const [ticket] = await db
    .insert(schema.ticketTypes)
    .values({ eventId: event!.id, name: 'Free', priceMillimes: 0, quantity: 10 })
    .returning();
  eventIds.push(event!.id);
  return { event: event!, ticket: ticket! };
}

function book(actor: Actor, eventId: string, ticketTypeId: string, i: number) {
  return createBooking(
    db,
    deps,
    actor,
    {
      eventId,
      lines: [{ ticketTypeId, quantity: 1 }],
      attendees: [{ fullName: `Buyer ${i}` }],
      answers: {},
      payDeposit: false,
      idempotencyKey: `${run}-${eventId}-${i}`,
      utm: {},
    },
    'fr',
  );
}

beforeAll(async () => {
  const [user] = await db
    .insert(schema.users)
    .values({ name: 'Integration buyer', email: `${run}@test.doulisha.invalid` })
    .returning();
  userId = user!.id;
});

afterAll(async () => {
  if (eventIds.length) {
    await db.delete(schema.orders).where(inArray(schema.orders.eventId, eventIds));
    await db.delete(schema.events).where(inArray(schema.events.id, eventIds));
  }
  if (userId) await db.delete(schema.users).where(eq(schema.users.id, userId));
});

describe('booking under concurrency', () => {
  it('sells exactly 10 of 10 places to 50 parallel buyers (no waitlist)', async () => {
    const { event, ticket } = await createEvent(false);
    const actor: Actor = { userId, roles: ['participant'], isAnonymous: false };

    const results = await Promise.allSettled(
      Array.from({ length: 50 }, (_, i) => book(actor, event.id, ticket.id, i)),
    );
    const ok = results.filter((r) => r.status === 'fulfilled');
    const refused = results.filter(
      (r) =>
        r.status === 'rejected' &&
        r.reason instanceof AppError &&
        r.reason.messageKey === 'errors.soldOut',
    );
    expect(ok).toHaveLength(10);
    expect(refused).toHaveLength(40);

    const [after] = await db.select().from(schema.events).where(eq(schema.events.id, event.id));
    const [stock] = await db
      .select()
      .from(schema.ticketTypes)
      .where(eq(schema.ticketTypes.id, ticket.id));
    const confirmed = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.eventId, event.id));
    expect(after?.placesTaken).toBe(10);
    expect(after?.status).toBe('full');
    expect(stock?.sold).toBe(10);
    expect(confirmed.filter((b) => b.status === 'confirmed')).toHaveLength(10);
  });

  it('puts the other 40 buyers on the waitlist in order', async () => {
    const { event, ticket } = await createEvent(true);
    const actor: Actor = { userId, roles: ['participant'], isAnonymous: false };

    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) => book(actor, event.id, ticket.id, i)),
    );
    expect(results.filter((r) => r.status === 'confirmed')).toHaveLength(10);
    expect(results.filter((r) => r.status === 'waitlisted')).toHaveLength(40);

    const bookings = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.eventId, event.id));
    const positions = bookings
      .filter((b) => b.status === 'waitlisted')
      .map((b) => b.waitlistPosition)
      .sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(positions).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    const [after] = await db.select().from(schema.events).where(eq(schema.events.id, event.id));
    expect(after?.placesTaken).toBe(10);
  });
});
