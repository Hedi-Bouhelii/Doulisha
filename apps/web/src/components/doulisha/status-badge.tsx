import { useTranslations } from 'next-intl';

import { Badge, type BadgeTone } from '@/components/ui/badge';

/**
 * One status system for the whole app (design system v2): the same status
 * always gets the same tone, wherever it appears.
 */
export const statusTone = {
  // Events
  draft: 'neutral',
  published: 'success',
  full: 'info',
  closed: 'neutral',
  ongoing: 'primary',
  completed: 'neutral',
  cancelled: 'danger',
  // Visibility
  public: 'primary',
  unlisted: 'info',
  private: 'accent',
  // Payments and bookings
  paid: 'success',
  confirmed: 'success',
  pending: 'warning',
  toPay: 'warning',
  awaiting_payment: 'warning',
  partially_paid: 'warning',
  deposit: 'info',
  reserved: 'warning',
  waitlisted: 'info',
  offered: 'info',
  refunded: 'neutral',
  expired: 'neutral',
  approved: 'success',
  rejected: 'danger',
} as const satisfies Record<string, BadgeTone>;

export type KnownStatus = keyof typeof statusTone;

/** Tone for a status, neutral when unknown. */
export function toneOf(status: string): BadgeTone {
  return (statusTone as Record<string, BadgeTone>)[status] ?? 'neutral';
}

type EventStatus =
  'draft' | 'published' | 'full' | 'closed' | 'ongoing' | 'completed' | 'cancelled';

/** An event's status as a pill with a dot (organizer space). */
export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('Organizer.statusLabel');
  const known = [
    'draft',
    'published',
    'full',
    'closed',
    'ongoing',
    'completed',
    'cancelled',
  ].includes(status);
  return (
    <Badge variant={toneOf(status)} dot data-testid="event-status">
      {known ? t(status as EventStatus) : status}
    </Badge>
  );
}
