import type { Executor } from '@doulisha/db';
import { schema } from '@doulisha/db';
import { and, asc, eq, isNotNull } from 'drizzle-orm';

import type { BuyerNotice, ServiceDeps } from '../deps';

const PLACEHOLDER_EMAIL = /@(phone|guest)\.doulisha\.invalid$/;

/**
 * Where to reach the buyer of an order: the phone or email they gave for
 * themselves at checkout, else their account's verified phone or email.
 */
export async function buyerContact(db: Executor, orderId: string) {
  const [row] = await db
    .select({
      buyerId: schema.orders.buyerId,
      locale: schema.orders.locale,
      reference: schema.orders.reference,
      eventTitle: schema.events.title,
      userPhone: schema.users.phoneNumber,
      userEmail: schema.users.email,
    })
    .from(schema.orders)
    .innerJoin(schema.users, eq(schema.users.id, schema.orders.buyerId))
    .innerJoin(schema.events, eq(schema.events.id, schema.orders.eventId))
    .where(eq(schema.orders.id, orderId));
  if (!row) return null;
  const [self] = await db
    .select({ phone: schema.attendees.phone, email: schema.attendees.email })
    .from(schema.attendees)
    .innerJoin(schema.bookings, eq(schema.bookings.id, schema.attendees.bookingId))
    .where(and(eq(schema.bookings.orderId, orderId), isNotNull(schema.attendees.userId)))
    .orderBy(asc(schema.attendees.createdAt))
    .limit(1);
  return {
    locale: row.locale,
    reference: row.reference,
    eventTitle: row.eventTitle,
    to: {
      phone: self?.phone ?? row.userPhone ?? null,
      email:
        self?.email ??
        (row.userEmail && !PLACEHOLDER_EMAIL.test(row.userEmail) ? row.userEmail : null),
    },
  };
}

/**
 * Tells the buyer what happened to their booking. Messaging never makes the
 * organizer's action fail: errors are logged and swallowed.
 */
export async function notifyBuyer(
  db: Executor,
  deps: Pick<ServiceDeps, 'notify'>,
  orderId: string,
  notice: Pick<BuyerNotice, 'kind' | 'amountMillimes' | 'reason' | 'note'>,
) {
  if (!deps.notify) return;
  try {
    const contact = await buyerContact(db, orderId);
    if (!contact || (!contact.to.phone && !contact.to.email)) return;
    await deps.notify({ ...contact, ...notice });
  } catch (error) {
    console.error('Buyer notification failed', error);
  }
}
