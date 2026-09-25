import type { Executor } from '@doulisha/db';
import { schema } from '@doulisha/db';
import type { Locale } from '@doulisha/i18n';
import {
  buildDetailsSchema,
  localizeBrief,
  type TemplateDefinitionData,
} from '@doulisha/templates';
import type {
  bookingQuestionInputSchema,
  EventPatch,
  meetingPointInputSchema,
  programmeStepInputSchema,
  TicketTypeInput,
} from '@doulisha/validators';
import { and, asc, desc, eq, inArray, isNull, notInArray, or } from 'drizzle-orm';
import type { z } from 'zod';

import { publishProblems, type PublishProblem } from '../domain/publish';
import { makeSlug } from '../domain/slug';
import type { ServiceDeps } from '../deps';
import { AppError } from '../errors';
import { assertCanManageEvent, type Actor } from '../permissions';
import { coverUrlFromKey } from './uploads';

/** Loads an event with what permission checks need, or throws NOT_FOUND. */
export async function loadManagedEvent(db: Executor, actor: Actor | null, eventId: string) {
  const [row] = await db
    .select({ event: schema.events, organizerOwnerId: schema.organizerProfiles.ownerUserId })
    .from(schema.events)
    .leftJoin(
      schema.organizerProfiles,
      eq(schema.organizerProfiles.id, schema.events.organizerProfileId),
    )
    .where(and(eq(schema.events.id, eventId), isNull(schema.events.deletedAt)))
    .limit(1);
  if (!row) throw new AppError('NOT_FOUND', 'errors.notFound');
  assertCanManageEvent(actor, {
    creatorId: row.event.creatorId,
    organizerOwnerId: row.organizerOwnerId,
  });
  return row.event;
}

async function loadTemplate(db: Executor, templateId: string) {
  const [template] = await db
    .select()
    .from(schema.templates)
    .where(eq(schema.templates.id, templateId));
  if (!template) throw new AppError('NOT_FOUND', 'errors.notFound');
  return template;
}

/** Next Saturday at 09:00 Tunisia time: a sensible default date for a new draft. */
export function defaultStart(now = new Date()): Date {
  const date = new Date(now);
  const days = (6 - date.getUTCDay() + 7) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(8, 0, 0, 0); // 09:00 in Tunis (UTC+1)
  return date;
}

async function assertOwnsOrganizer(db: Executor, actor: Actor, organizerProfileId: string) {
  const [profile] = await db
    .select({ owner: schema.organizerProfiles.ownerUserId })
    .from(schema.organizerProfiles)
    .where(eq(schema.organizerProfiles.id, organizerProfileId));
  if (!profile || profile.owner !== actor.userId)
    throw new AppError('FORBIDDEN', 'errors.forbidden');
}

/**
 * EVT-01: step 1 of the wizard. Creates a draft from a category template,
 * pre-filled with the template's brief (in the event language), policy,
 * visibility and first registration type.
 */
export async function createDraft(
  db: Executor,
  actor: Actor,
  input: { templateKey: string; organizerProfileId?: string | null | undefined; language: Locale },
  now = new Date(),
) {
  const [template] = await db
    .select()
    .from(schema.templates)
    .where(and(eq(schema.templates.key, input.templateKey), eq(schema.templates.isActive, true)));
  if (!template) throw new AppError('NOT_FOUND', 'errors.notFound');
  if (input.organizerProfileId) await assertOwnsOrganizer(db, actor, input.organizerProfileId);

  const def = template.definition;
  const [event] = await db
    .insert(schema.events)
    .values({
      slug: makeSlug('draft'),
      organizerProfileId: input.organizerProfileId ?? null,
      creatorId: actor.userId,
      templateId: template.id,
      categoryId: template.categoryId,
      model: template.model,
      status: 'draft',
      visibility: def.defaultVisibility,
      title: '',
      language: input.language,
      startsAt: defaultStart(now),
      registrationType: def.registrationTypes[0] ?? 'free_rsvp',
      cancellationPolicy: def.cancellationPolicy,
      brief: localizeBrief(def.defaultBrief, input.language),
    })
    .returning({ id: schema.events.id });
  return event!;
}

/** Everything the wizard shows for one event. */
export async function getEditableEvent(db: Executor, actor: Actor | null, eventId: string) {
  const event = await loadManagedEvent(db, actor, eventId);
  const [template, tickets, points, steps, questions] = await Promise.all([
    loadTemplate(db, event.templateId),
    db
      .select()
      .from(schema.ticketTypes)
      .where(eq(schema.ticketTypes.eventId, eventId))
      .orderBy(asc(schema.ticketTypes.sort)),
    db
      .select()
      .from(schema.meetingPoints)
      .where(eq(schema.meetingPoints.eventId, eventId))
      .orderBy(asc(schema.meetingPoints.sort)),
    db
      .select()
      .from(schema.itinerarySteps)
      .where(eq(schema.itinerarySteps.eventId, eventId))
      .orderBy(asc(schema.itinerarySteps.day), asc(schema.itinerarySteps.sort)),
    db
      .select()
      .from(schema.bookingQuestions)
      .where(eq(schema.bookingQuestions.eventId, eventId))
      .orderBy(asc(schema.bookingQuestions.sort)),
  ]);
  return {
    event,
    template: {
      key: template.key,
      name: template.name,
      model: template.model,
      definition: template.definition,
    },
    tickets,
    meetingPoints: points,
    programme: steps,
    questions,
    problems: publishProblems({ ...event, tickets }, template.definition),
  };
}

/** Validates template fields; drafts may leave required fields empty until publishing. */
function validateDetails(definition: TemplateDefinitionData, details: Record<string, unknown>) {
  const parsed = buildDetailsSchema(definition).partial().safeParse(details);
  if (!parsed.success) {
    throw new AppError('BAD_REQUEST', 'errors.invalidDetails', {
      fields: parsed.error.issues.map((i) => i.path.join('.')),
    });
  }
  return parsed.data;
}

/** EVT-02 to EVT-05: auto-saves wizard fields (a partial update). */
export async function updateEvent(
  db: Executor,
  deps: Pick<ServiceDeps, 'storage'>,
  actor: Actor,
  eventId: string,
  patch: EventPatch,
) {
  const event = await loadManagedEvent(db, actor, eventId);
  if (event.status === 'cancelled' || event.status === 'completed') {
    throw new AppError('BAD_REQUEST', 'errors.eventLocked');
  }
  if (patch.organizerProfileId) await assertOwnsOrganizer(db, actor, patch.organizerProfileId);
  if (patch.capacity != null && patch.capacity < event.placesTaken) {
    throw new AppError('BAD_REQUEST', 'errors.capacityBelowBooked', { booked: event.placesTaken });
  }
  let details = event.details;
  if (patch.details) {
    const template = await loadTemplate(db, event.templateId);
    details = validateDetails(template.definition, { ...event.details, ...patch.details });
  }
  const { details: _ignored, coverKey, ...rest } = patch;
  const cover =
    coverKey === undefined
      ? {}
      : { coverUrl: coverKey === null ? null : coverUrlFromKey(deps, actor, coverKey) };
  await db
    .update(schema.events)
    .set({ ...rest, ...cover, details })
    .where(eq(schema.events.id, eventId));
}

/**
 * TKT-02: replaces the ticket types. Types that already sold tickets are kept
 * (deactivated if removed) so existing bookings stay valid.
 */
export async function setTickets(
  db: Executor,
  actor: Actor,
  eventId: string,
  tickets: TicketTypeInput[],
) {
  await loadManagedEvent(db, actor, eventId);
  const existing = await db
    .select()
    .from(schema.ticketTypes)
    .where(eq(schema.ticketTypes.eventId, eventId));
  const keepIds = tickets.flatMap((t) => (t.id ? [t.id] : []));

  for (const old of existing) {
    if (keepIds.includes(old.id)) continue;
    if (old.sold > 0) {
      await db
        .update(schema.ticketTypes)
        .set({ isActive: false })
        .where(eq(schema.ticketTypes.id, old.id));
    } else {
      await db.delete(schema.ticketTypes).where(eq(schema.ticketTypes.id, old.id));
    }
  }
  for (const [sort, t] of tickets.entries()) {
    const values = {
      kind: t.kind,
      name: t.name,
      description: t.description ?? null,
      priceMillimes: t.priceMillimes,
      depositMillimes: t.depositMillimes ?? null,
      quantity: t.quantity ?? null,
      seatsPerTicket: t.seatsPerTicket,
      sort,
      isActive: true,
    };
    const previous = t.id ? existing.find((e) => e.id === t.id) : undefined;
    if (previous) {
      if (values.quantity !== null && values.quantity < previous.sold) {
        throw new AppError('BAD_REQUEST', 'errors.capacityBelowBooked', { booked: previous.sold });
      }
      await db.update(schema.ticketTypes).set(values).where(eq(schema.ticketTypes.id, previous.id));
    } else {
      await db.insert(schema.ticketTypes).values({ ...values, eventId });
    }
  }
  await refreshPriceFrom(db, eventId);
}

async function refreshPriceFrom(db: Executor, eventId: string) {
  const active = await db
    .select({ price: schema.ticketTypes.priceMillimes })
    .from(schema.ticketTypes)
    .where(and(eq(schema.ticketTypes.eventId, eventId), eq(schema.ticketTypes.isActive, true)));
  const paid = active.map((t) => t.price).filter((p) => p > 0);
  await db
    .update(schema.events)
    .set({ priceFromMillimes: paid.length > 0 ? Math.min(...paid) : null })
    .where(eq(schema.events.id, eventId));
}

/** LOG-01: replaces the meeting points (points already chosen by bookings are kept). */
export async function setMeetingPoints(
  db: Executor,
  actor: Actor,
  eventId: string,
  points: z.infer<typeof meetingPointInputSchema>[],
) {
  await loadManagedEvent(db, actor, eventId);
  const used = await db
    .selectDistinct({ id: schema.bookings.meetingPointId })
    .from(schema.bookings)
    .where(eq(schema.bookings.eventId, eventId));
  const usedIds = used.flatMap((u) => (u.id ? [u.id] : []));
  await db
    .delete(schema.meetingPoints)
    .where(
      and(
        eq(schema.meetingPoints.eventId, eventId),
        usedIds.length ? notInArray(schema.meetingPoints.id, usedIds) : undefined,
      ),
    );
  if (points.length > 0) {
    await db.insert(schema.meetingPoints).values(
      points.map((p, sort) => ({
        eventId,
        name: p.name,
        address: p.address ?? null,
        meetAt: p.meetAt,
        location: p.location ?? null,
        sort: sort + usedIds.length,
      })),
    );
  }
}

/** EVT-06: replaces the programme. */
export async function setProgramme(
  db: Executor,
  actor: Actor,
  eventId: string,
  steps: z.infer<typeof programmeStepInputSchema>[],
) {
  await loadManagedEvent(db, actor, eventId);
  await db.delete(schema.itinerarySteps).where(eq(schema.itinerarySteps.eventId, eventId));
  if (steps.length > 0) {
    await db.insert(schema.itinerarySteps).values(
      steps.map((s, sort) => ({
        eventId,
        day: s.day,
        title: s.title,
        startsAt: s.startsAt ?? null,
        sort,
      })),
    );
  }
}

/** TKT-03: replaces the booking questions. */
export async function setQuestions(
  db: Executor,
  actor: Actor,
  eventId: string,
  questions: z.infer<typeof bookingQuestionInputSchema>[],
) {
  await loadManagedEvent(db, actor, eventId);
  await db.delete(schema.bookingQuestions).where(eq(schema.bookingQuestions.eventId, eventId));
  if (questions.length > 0) {
    await db.insert(schema.bookingQuestions).values(
      questions.map((q, sort) => ({
        eventId,
        label: q.label,
        type: q.type,
        options: q.options,
        required: q.required,
        sort,
      })),
    );
  }
}

/**
 * Publishes a draft once nothing is missing. Free events without tickets get
 * a free "Entry" ticket so everyone books the same way.
 */
export async function publishEvent(
  db: Executor,
  actor: Actor,
  eventId: string,
  now = new Date(),
): Promise<{ slug: string; problems: PublishProblem[] }> {
  const data = await getEditableEvent(db, actor, eventId);
  const { event } = data;
  if (event.status !== 'draft') return { slug: event.slug, problems: [] };

  const template = await loadTemplate(db, event.templateId);
  const details = buildDetailsSchema(template.definition).safeParse(event.details);
  const problems = publishProblems({ ...event, tickets: data.tickets }, template.definition, now);
  if (!details.success && problems.length === 0) problems.push('details.invalid');
  if (problems.length > 0) return { slug: event.slug, problems };

  if (event.model !== 'private' && data.tickets.filter((t) => t.isActive).length === 0) {
    await db.insert(schema.ticketTypes).values({
      eventId,
      name: event.language === 'ar' ? 'دخول' : event.language === 'fr' ? 'Entrée' : 'Entry',
      priceMillimes: 0,
      quantity: event.capacity,
    });
  }
  const slug = makeSlug(event.title);
  await db
    .update(schema.events)
    .set({ status: 'published', slug, publishedAt: now })
    .where(eq(schema.events.id, eventId));
  await db
    .insert(schema.occurrences)
    .values({ eventId, startsAt: event.startsAt, endsAt: event.endsAt });
  return { slug, problems: [] };
}

/** EVT-08: copies an event as a new draft (new dates are set in the wizard). */
export async function duplicateEvent(
  db: Executor,
  actor: Actor,
  eventId: string,
  now = new Date(),
) {
  const data = await getEditableEvent(db, actor, eventId);
  const { event } = data;
  const {
    id: _id,
    slug: _slug,
    createdAt: _c,
    updatedAt: _u,
    publishedAt: _p,
    cancelledAt: _x,
    placesTaken: _t,
    ...copy
  } = event;
  const [draft] = await db
    .insert(schema.events)
    .values({
      ...copy,
      slug: makeSlug('draft'),
      status: 'draft',
      creatorId: actor.userId,
      startsAt: event.startsAt > now ? event.startsAt : defaultStart(now),
      endsAt: null,
      placesTaken: 0,
    })
    .returning({ id: schema.events.id });
  const id = draft!.id;
  if (data.tickets.length) {
    await db.insert(schema.ticketTypes).values(
      data.tickets
        .filter((t) => t.isActive)
        .map(({ id: _i, createdAt: _cc, updatedAt: _uu, sold: _s, eventId: _e, ...t }) => ({
          ...t,
          eventId: id,
          sold: 0,
        })),
    );
  }
  if (data.questions.length) {
    await db.insert(schema.bookingQuestions).values(
      data.questions.map(({ id: _i, createdAt: _cc, updatedAt: _uu, eventId: _e, ...q }) => ({
        ...q,
        eventId: id,
      })),
    );
  }
  if (data.programme.length) {
    await db.insert(schema.itinerarySteps).values(
      data.programme.map(({ id: _i, createdAt: _cc, updatedAt: _uu, eventId: _e, ...s }) => ({
        ...s,
        startsAt: null,
        eventId: id,
      })),
    );
  }
  return { id };
}

/** Events the actor manages: created by them or by one of their organizer profiles. */
export async function listManagedEvents(db: Executor, actor: Actor) {
  const profiles = await db
    .select({ id: schema.organizerProfiles.id })
    .from(schema.organizerProfiles)
    .where(eq(schema.organizerProfiles.ownerUserId, actor.userId));
  const profileIds = profiles.map((p) => p.id);
  return db
    .select({
      id: schema.events.id,
      slug: schema.events.slug,
      title: schema.events.title,
      status: schema.events.status,
      visibility: schema.events.visibility,
      model: schema.events.model,
      startsAt: schema.events.startsAt,
      city: schema.events.city,
      capacity: schema.events.capacity,
      placesTaken: schema.events.placesTaken,
      coverUrl: schema.events.coverUrl,
      priceFromMillimes: schema.events.priceFromMillimes,
    })
    .from(schema.events)
    .where(
      and(
        isNull(schema.events.deletedAt),
        or(
          eq(schema.events.creatorId, actor.userId),
          profileIds.length ? inArray(schema.events.organizerProfileId, profileIds) : undefined,
        ),
      ),
    )
    .orderBy(desc(schema.events.startsAt));
}
