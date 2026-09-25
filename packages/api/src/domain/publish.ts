import type { TemplateDefinitionData } from '@doulisha/templates';

/** What an event needs before it can be published; each key maps to a message. */
export type PublishProblem =
  | 'title'
  | 'startsAt'
  | 'endsAt'
  | 'city'
  | 'tickets'
  | 'paidTickets'
  | 'organizer'
  | 'capacity'
  | `details.${string}`;

export interface PublishCheckInput {
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  city: string | null;
  venueName: string | null;
  model: 'ticketed' | 'group_trip' | 'private' | 'slot_booking';
  registrationType: 'free_rsvp' | 'paid' | 'deposit' | 'pay_at_door';
  organizerProfileId: string | null;
  capacity: number | null;
  minToConfirm: number | null;
  details: Record<string, unknown>;
  tickets: { priceMillimes: number; depositMillimes: number | null; isActive: boolean }[];
}

/**
 * Checks an event before publishing (EVT-01 to EVT-05, TKT-01/02). Pure, so the
 * wizard can show the same list the server enforces.
 */
export function publishProblems(
  event: PublishCheckInput,
  definition: Pick<TemplateDefinitionData, 'fields'>,
  now = new Date(),
): PublishProblem[] {
  const problems: PublishProblem[] = [];
  if (event.title.trim().length < 3) problems.push('title');
  if (event.startsAt <= now) problems.push('startsAt');
  if (event.endsAt && event.endsAt <= event.startsAt) problems.push('endsAt');
  if (event.model !== 'private' && !event.city?.trim() && !event.venueName?.trim()) {
    problems.push('city');
  }
  if (
    event.capacity !== null &&
    event.minToConfirm !== null &&
    event.minToConfirm > event.capacity
  ) {
    problems.push('capacity');
  }

  for (const field of definition.fields) {
    const value = event.details[field.key];
    if (field.required && (value === undefined || value === null || value === '')) {
      problems.push(`details.${field.key}`);
    }
  }

  const active = event.tickets.filter((t) => t.isActive);
  const sellsTickets = event.registrationType !== 'free_rsvp';
  if (sellsTickets) {
    if (active.length === 0) problems.push('tickets');
    else if (!active.some((t) => t.priceMillimes > 0)) problems.push('paidTickets');
    else if (
      event.registrationType === 'deposit' &&
      !active.some((t) => t.depositMillimes !== null && t.depositMillimes > 0)
    ) {
      problems.push('paidTickets');
    }
    // Selling tickets needs an organizer profile (payments go to the organizer).
    if (!event.organizerProfileId) problems.push('organizer');
  }
  return problems;
}
