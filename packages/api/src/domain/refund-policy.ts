export type CancellationPolicy = 'flexible' | 'moderate' | 'strict';

const HOUR = 3_600_000;

/** How long before the start a participant can still cancel for a full refund. */
export const fullRefundWindowMs: Record<CancellationPolicy, number | null> = {
  flexible: 24 * HOUR,
  moderate: 7 * 24 * HOUR,
  /** Strict: no refund when the participant cancels. */
  strict: null,
};

/**
 * PAY-04: the refund owed when a booking is cancelled, from the event's policy
 * (EVT-05). If the organizer cancels the event, everyone gets everything back.
 * Returns millimes; the organizer still approves the refund.
 */
export function refundAmount({
  policy,
  startsAt,
  now,
  paidMillimes,
  cancelledByOrganizer,
}: {
  policy: CancellationPolicy;
  startsAt: Date;
  now: Date;
  paidMillimes: number;
  cancelledByOrganizer: boolean;
}): number {
  if (paidMillimes <= 0) return 0;
  if (cancelledByOrganizer) return paidMillimes;
  const window = fullRefundWindowMs[policy];
  if (window === null) return 0;
  return startsAt.getTime() - now.getTime() >= window ? paidMillimes : 0;
}
