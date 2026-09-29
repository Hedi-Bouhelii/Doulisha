import { z } from 'zod';

import { MESSAGE_MAX_LENGTH } from '../domain/chat-access';
import {
  countUnread,
  getThread,
  listInbox,
  openGroupChat,
  openOrganizerThread,
  sendMessage,
} from '../services/chat';
import { protectedProcedure, router, sessionProcedure } from '../trpc';

const eventInput = z.object({ eventId: z.uuid() });
const conversationInput = z.object({ conversationId: z.uuid() });

/**
 * Event chat (ADR 0021): a member's thread with an event's organizers (COM-05)
 * and a private event's group chat (COM-06). Guests with a session can use the
 * group chat of an event they answered.
 */
export const chatRouter = router({
  /** "Ask the organizer": opens (or reuses) the member's thread for a public event. */
  openWithOrganizer: protectedProcedure
    .input(eventInput)
    .mutation(({ ctx, input }) => openOrganizerThread(ctx.db, ctx.actor, input.eventId)),

  /** The group chat of a private event, for hosts and guests going or maybe. */
  openGroup: sessionProcedure
    .input(eventInput)
    .mutation(({ ctx, input }) => openGroupChat(ctx.db, ctx.actor, input.eventId)),

  /** Latest messages, oldest first; marks the conversation read. Polled while open. */
  thread: sessionProcedure
    .input(conversationInput)
    .query(({ ctx, input }) => getThread(ctx.db, ctx.actor, input.conversationId)),

  send: sessionProcedure
    .input(conversationInput.extend({ body: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH) }))
    .mutation(({ ctx, input }) => sendMessage(ctx.db, ctx.actor, input.conversationId, input.body)),

  /** Every conversation of the actor, latest first, with unread counts. */
  inbox: sessionProcedure.query(({ ctx }) => listInbox(ctx.db, ctx.actor)),

  /** Unread messages in total, for the menu badge. */
  unread: sessionProcedure.query(({ ctx }) => countUnread(ctx.db, ctx.actor)),
});
