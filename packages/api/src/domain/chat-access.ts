/** Longest message, also enforced by the database. */
export const MESSAGE_MAX_LENGTH = 2000;
/** Messages one person may send per minute, across all conversations. */
export const MESSAGES_PER_MINUTE = 20;
/** How many recent messages a thread shows. */
export const THREAD_PAGE = 100;

export type ConversationKind = 'organizer' | 'group';
export type ChatRole = 'organizer' | 'member';

/** Guest answers that count as being part of a private event. */
export const GROUP_RSVP_STATUSES = ['going', 'maybe'] as const;

export interface ChatContext {
  kind: ConversationKind;
  /** The participant of an organizer thread; null for a group chat. */
  memberId: string | null;
  /** The actor manages the event (creator, organizer profile owner, admin). */
  managesEvent: boolean;
  /** The actor answered "going" or "maybe" to the private event. */
  hasGroupRsvp: boolean;
}

/**
 * Who may read and write in a conversation (ADR 0021): the event's organizers
 * in both kinds; the one participant of an organizer thread; hosts and guests
 * who said "going" or "maybe" in a private event's group chat.
 */
export function chatRole(actorId: string, context: ChatContext): ChatRole | null {
  if (context.managesEvent) return 'organizer';
  if (context.kind === 'organizer') return context.memberId === actorId ? 'member' : null;
  return context.hasGroupRsvp ? 'member' : null;
}
