import {
  bookingQuestionInputSchema,
  eventPatchSchema,
  localeSchema,
  meetingPointInputSchema,
  programmeStepInputSchema,
  ticketTypeInputSchema,
} from '@doulisha/validators';
import { z } from 'zod';

import {
  createDraft,
  duplicateEvent,
  getEditableEvent,
  listManagedEvents,
  publishEvent,
  setMeetingPoints,
  setProgramme,
  setQuestions,
  setTickets,
  updateEvent,
} from '../services/event-editor';
import { listTemplates } from '../services/templates-admin';
import { protectedProcedure, router } from '../trpc';

const eventId = z.object({ eventId: z.uuid() });

/** Create-event wizard (EVT-01 to EVT-09). Every procedure checks the actor manages the event. */
export const editorRouter = router({
  /** Active templates grouped by category: step 1 of the wizard (EVT-01). */
  templates: protectedProcedure.query(({ ctx }) => listTemplates(ctx.db, ctx.locale, true)),

  /** Events the member manages (created by them or their organizer profiles). */
  myEvents: protectedProcedure.query(({ ctx }) => listManagedEvents(ctx.db, ctx.actor)),

  /** Creates a draft from a template, pre-filled in the chosen language. */
  create: protectedProcedure
    .input(
      z.object({
        templateKey: z.string().min(1).max(40),
        organizerProfileId: z.uuid().nullish(),
        language: localeSchema.optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      createDraft(ctx.db, ctx.actor, {
        templateKey: input.templateKey,
        organizerProfileId: input.organizerProfileId,
        language: input.language ?? ctx.locale,
      }),
    ),

  /** Everything the wizard needs for one event, with the list of publish problems. */
  get: protectedProcedure
    .input(eventId)
    .query(({ ctx, input }) => getEditableEvent(ctx.db, ctx.actor, input.eventId)),

  /** Auto-save: partial update of the event fields (template details validated). */
  update: protectedProcedure
    .input(eventId.extend({ patch: eventPatchSchema }))
    .mutation(({ ctx, input }) => updateEvent(ctx.db, ctx.actor, input.eventId, input.patch)),

  /** Replaces the ticket types (TKT-02); types with sales are kept and deactivated. */
  setTickets: protectedProcedure
    .input(eventId.extend({ tickets: z.array(ticketTypeInputSchema).max(10) }))
    .mutation(({ ctx, input }) => setTickets(ctx.db, ctx.actor, input.eventId, input.tickets)),

  /** Replaces the meeting points (LOG-01). */
  setMeetingPoints: protectedProcedure
    .input(eventId.extend({ points: z.array(meetingPointInputSchema).max(10) }))
    .mutation(({ ctx, input }) => setMeetingPoints(ctx.db, ctx.actor, input.eventId, input.points)),

  /** Replaces the programme (EVT-06). */
  setProgramme: protectedProcedure
    .input(eventId.extend({ steps: z.array(programmeStepInputSchema).max(50) }))
    .mutation(({ ctx, input }) => setProgramme(ctx.db, ctx.actor, input.eventId, input.steps)),

  /** Replaces the booking questions (TKT-03). */
  setQuestions: protectedProcedure
    .input(eventId.extend({ questions: z.array(bookingQuestionInputSchema).max(10) }))
    .mutation(({ ctx, input }) => setQuestions(ctx.db, ctx.actor, input.eventId, input.questions)),

  /** Publishes the draft, or returns what is missing. */
  publish: protectedProcedure
    .input(eventId)
    .mutation(({ ctx, input }) => publishEvent(ctx.db, ctx.actor, input.eventId)),

  /** Copies an event as a new draft (EVT-08). */
  duplicate: protectedProcedure
    .input(eventId)
    .mutation(({ ctx, input }) => duplicateEvent(ctx.db, ctx.actor, input.eventId)),
});
