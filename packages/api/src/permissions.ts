import type { UserRole } from '@doulisha/auth';

import { AppError } from './errors';

export interface Actor {
  userId: string;
  roles: readonly UserRole[];
  isAnonymous: boolean;
}

export function hasRole(actor: Actor | null, role: UserRole): boolean {
  return actor !== null && actor.roles.includes(role);
}

export function isAdmin(actor: Actor | null): boolean {
  return hasRole(actor, 'admin');
}

/** Throws unless the actor has at least one of the roles. Admins pass every role check. */
export function assertRole(actor: Actor | null, ...roles: UserRole[]): asserts actor is Actor {
  if (actor === null || actor.isAnonymous)
    throw new AppError('UNAUTHORIZED', 'errors.signInRequired');
  if (isAdmin(actor)) return;
  if (!roles.some((role) => actor.roles.includes(role))) {
    throw new AppError('FORBIDDEN', 'errors.forbidden');
  }
}

export interface ManagedEvent {
  creatorId: string;
  /** Owner of the organizer profile that publishes the event, if any. */
  organizerOwnerId: string | null;
}

/**
 * Who may edit an event and see its attendee list: its creator (the host),
 * the owner of the publishing organizer profile, and admins.
 * Co-organizers (ACC-07) arrive in V1.
 */
export function canManageEvent(actor: Actor | null, event: ManagedEvent): boolean {
  if (actor === null || actor.isAnonymous) return false;
  if (isAdmin(actor)) return true;
  return actor.userId === event.creatorId || actor.userId === event.organizerOwnerId;
}

export function assertCanManageEvent(actor: Actor | null, event: ManagedEvent): void {
  if (!canManageEvent(actor, event)) throw new AppError('FORBIDDEN', 'errors.forbidden');
}
