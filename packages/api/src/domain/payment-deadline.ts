const HOUR = 3_600_000;

/** Time to pay by D17 or transfer after booking (founder review, OPEN_QUESTIONS Q25). */
export const MANUAL_PAYMENT_HOURS = 48;
/** Time to send a new receipt after one is rejected. */
export const RESUBMIT_HOURS = 24;
/** Reservations end this long before the event, so the organizer has a final list. */
export const LAST_CALL_HOURS = 12;
/** Late bookings always get at least this long to pay (never past the start). */
export const MIN_PAYMENT_HOURS = 2;

/**
 * When an unpaid D17 or transfer reservation lapses (ADR 0018): `hours` from
 * now, but no later than LAST_CALL_HOURS before the event. A booking made close
 * to the event still gets MIN_PAYMENT_HOURS, never beyond the start.
 */
export function manualPaymentDeadline(
  now: Date,
  startsAt: Date,
  hours: number = MANUAL_PAYMENT_HOURS,
): Date {
  const wanted = now.getTime() + hours * HOUR;
  const lastCall = startsAt.getTime() - LAST_CALL_HOURS * HOUR;
  const floor = Math.min(now.getTime() + MIN_PAYMENT_HOURS * HOUR, startsAt.getTime());
  return new Date(Math.max(Math.min(wanted, lastCall), floor));
}

/** "Extend the deadline": one more day from the later of now and the current deadline. */
export function extendedDeadline(now: Date, current: Date | null, startsAt: Date): Date {
  const base = Math.max(now.getTime(), current?.getTime() ?? 0);
  return new Date(Math.min(base + 24 * HOUR, startsAt.getTime()));
}
