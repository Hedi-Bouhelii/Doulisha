import { fromTunisInput, type Locale, toTunisInput } from '@doulisha/i18n';

import { millimesToInput, parseDinars } from '@/lib/money';
import type { RouterInputs, RouterOutputs } from '@/trpc/types';

/**
 * The wizard's form model. Inputs hold strings (what the person typed); these
 * helpers convert between the server rows, the form and the API inputs, so
 * the conversion rules live in one tested place.
 */
export type Editable = RouterOutputs['editor']['get'];
type EventRow = Editable['event'];
export type EventPatch = RouterInputs['editor']['update']['patch'];

export type Audience = 'solo' | 'couple' | 'friends' | 'family' | 'kids';
export type RegistrationType = 'free_rsvp' | 'paid' | 'deposit' | 'pay_at_door';
export type Policy = 'flexible' | 'moderate' | 'strict';
export type Visibility = 'public' | 'unlisted' | 'private';

export interface EventForm {
  title: string;
  description: string;
  language: Locale;
  coverUrl: string | null;
  startsAt: string;
  endsAt: string;
  venueName: string;
  address: string;
  city: string;
  locationHiddenUntilBooking: boolean;
  minAge: string;
  audience: Audience[];
  capacity: string;
  minToConfirm: string;
  waitlistEnabled: boolean;
  registrationType: RegistrationType;
  cancellationPolicy: Policy;
  visibility: Visibility;
  whatToBring: string;
  dressCode: string;
  rules: string;
  safety: string;
  details: Record<string, unknown>;
  organizerProfileId: string;
}

export interface TicketForm {
  id?: string;
  kind: 'standard' | 'early_bird' | 'vip' | 'student' | 'couple' | 'group';
  name: string;
  price: string;
  deposit: string;
  quantity: string;
  seats: string;
}

export interface PointForm {
  name: string;
  meetAt: string;
}

export interface StepForm {
  day: string;
  title: string;
  startsAt: string;
}

export interface QuestionForm {
  label: string;
  type: 'text' | 'select' | 'number';
  options: string;
  required: boolean;
}

const text = (value: string | null | undefined) => value ?? '';
const optionalText = (value: string) => (value.trim() === '' ? null : value.trim());

/** "12" → 12, "" or "abc" → null. */
export function parseCount(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

export function toForm(event: EventRow): EventForm {
  return {
    title: event.title,
    description: text(event.description),
    language: event.language,
    coverUrl: event.coverUrl,
    startsAt: toTunisInput(event.startsAt),
    endsAt: event.endsAt ? toTunisInput(event.endsAt) : '',
    venueName: text(event.venueName),
    address: text(event.address),
    city: text(event.city),
    locationHiddenUntilBooking: event.locationHiddenUntilBooking,
    minAge: event.minAge === null ? '' : String(event.minAge),
    audience: event.audience as Audience[],
    capacity: event.capacity === null ? '' : String(event.capacity),
    minToConfirm: event.minToConfirm === null ? '' : String(event.minToConfirm),
    waitlistEnabled: event.waitlistEnabled,
    registrationType: event.registrationType,
    cancellationPolicy: event.cancellationPolicy,
    visibility: event.visibility,
    whatToBring: (event.brief.whatToBring ?? []).join('\n'),
    dressCode: text(event.brief.dressCode),
    rules: text(event.brief.rules),
    safety: text(event.brief.safety),
    details: event.details,
    organizerProfileId: event.organizerProfileId ?? '',
  };
}

/** Everything but the cover, which is saved on its own when a file is uploaded. */
export function toPatch(form: EventForm): EventPatch {
  const startsAt = fromTunisInput(form.startsAt);
  const brief = {
    whatToBring: form.whatToBring
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 20),
    dressCode: form.dressCode.trim() || undefined,
    rules: form.rules.trim() || undefined,
    safety: form.safety.trim() || undefined,
  };
  return {
    title: form.title,
    description: optionalText(form.description),
    language: form.language,
    ...(startsAt ? { startsAt } : {}),
    endsAt: fromTunisInput(form.endsAt),
    venueName: optionalText(form.venueName),
    address: optionalText(form.address),
    city: optionalText(form.city),
    locationHiddenUntilBooking: form.locationHiddenUntilBooking,
    minAge: parseCount(form.minAge),
    audience: form.audience,
    capacity: parseCount(form.capacity) || null,
    minToConfirm: parseCount(form.minToConfirm) || null,
    waitlistEnabled: form.waitlistEnabled,
    registrationType: form.registrationType,
    cancellationPolicy: form.cancellationPolicy,
    visibility: form.visibility,
    brief,
    details: form.details,
    organizerProfileId: form.organizerProfileId || null,
  };
}

export function toTicketForm(ticket: Editable['tickets'][number]): TicketForm {
  return {
    id: ticket.id,
    kind: ticket.kind,
    name: ticket.name,
    price: millimesToInput(ticket.priceMillimes),
    deposit: millimesToInput(ticket.depositMillimes),
    quantity: ticket.quantity === null ? '' : String(ticket.quantity),
    seats: String(ticket.seatsPerTicket),
  };
}

/** Rows without a name are ignored; free registration forces free tickets. */
export function toTicketInputs(
  tickets: TicketForm[],
  registrationType: RegistrationType,
): RouterInputs['editor']['setTickets']['tickets'] {
  const free = registrationType === 'free_rsvp';
  return tickets
    .filter((ticket) => ticket.name.trim() !== '')
    .map((ticket) => ({
      ...(ticket.id ? { id: ticket.id } : {}),
      kind: ticket.kind,
      name: ticket.name.trim(),
      priceMillimes: free ? 0 : (parseDinars(ticket.price) ?? 0),
      depositMillimes:
        registrationType === 'deposit' ? (parseDinars(ticket.deposit) ?? null) : null,
      quantity: parseCount(ticket.quantity) || null,
      seatsPerTicket: Math.min(20, Math.max(1, parseCount(ticket.seats) ?? 1)),
    }));
}

export function toPointInputs(
  points: PointForm[],
): RouterInputs['editor']['setMeetingPoints']['points'] {
  return points.flatMap((point) => {
    const meetAt = fromTunisInput(point.meetAt);
    return point.name.trim() && meetAt ? [{ name: point.name.trim(), meetAt }] : [];
  });
}

export function toStepInputs(steps: StepForm[]): RouterInputs['editor']['setProgramme']['steps'] {
  return steps
    .filter((step) => step.title.trim() !== '')
    .map((step) => ({
      day: Math.min(30, Math.max(1, parseCount(step.day) ?? 1)),
      title: step.title.trim(),
      startsAt: fromTunisInput(step.startsAt),
    }));
}

export function toQuestionInputs(
  questions: QuestionForm[],
): RouterInputs['editor']['setQuestions']['questions'] {
  return questions
    .filter((question) => question.label.trim() !== '')
    .map((question) => ({
      label: question.label.trim(),
      type: question.type,
      options:
        question.type === 'select'
          ? question.options
              .split(',')
              .map((option) => option.trim())
              .filter(Boolean)
              .slice(0, 20)
          : [],
      required: question.required,
    }));
}

/** Wizard step to open for a publish problem. */
export function stepForProblem(problem: string): number {
  if (problem === 'title' || problem === 'organizer') return 0;
  if (problem === 'startsAt' || problem === 'endsAt' || problem === 'city') return 1;
  if (problem.startsWith('details.')) return 2;
  return 3;
}
