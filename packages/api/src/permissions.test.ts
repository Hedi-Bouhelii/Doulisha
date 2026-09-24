import { describe, expect, it } from 'vitest';

import { AppError } from './errors';
import { assertRole, canManageEvent, type Actor } from './permissions';

const member: Actor = { userId: 'u1', roles: ['participant'], isAnonymous: false };
const organizer: Actor = { userId: 'u2', roles: ['participant', 'organizer'], isAnonymous: false };
const admin: Actor = { userId: 'u3', roles: ['participant', 'admin'], isAnonymous: false };
const guest: Actor = { userId: 'g1', roles: ['participant'], isAnonymous: true };

function codeOf(fn: () => void): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof AppError ? error.code : 'OTHER';
  }
  return undefined;
}

describe('assertRole', () => {
  it('requires a signed-in, non-guest user', () => {
    expect(codeOf(() => assertRole(null, 'organizer'))).toBe('UNAUTHORIZED');
    expect(codeOf(() => assertRole(guest, 'participant'))).toBe('UNAUTHORIZED');
  });

  it('checks the role', () => {
    expect(codeOf(() => assertRole(member, 'organizer'))).toBe('FORBIDDEN');
    expect(codeOf(() => assertRole(organizer, 'organizer'))).toBeUndefined();
  });

  it('lets admins through every role check', () => {
    expect(codeOf(() => assertRole(admin, 'organizer', 'provider'))).toBeUndefined();
  });
});

describe('canManageEvent', () => {
  const hostedByMember = { creatorId: 'u1', organizerOwnerId: null };
  const publishedByOrganizer = { creatorId: 'u9', organizerOwnerId: 'u2' };

  it('allows the host, the organizer owner and admins', () => {
    expect(canManageEvent(member, hostedByMember)).toBe(true);
    expect(canManageEvent(organizer, publishedByOrganizer)).toBe(true);
    expect(canManageEvent(admin, hostedByMember)).toBe(true);
  });

  it('refuses everyone else, including guests', () => {
    expect(canManageEvent(organizer, hostedByMember)).toBe(false);
    expect(canManageEvent(member, publishedByOrganizer)).toBe(false);
    expect(canManageEvent(null, hostedByMember)).toBe(false);
    expect(canManageEvent({ ...guest, userId: 'u1' }, hostedByMember)).toBe(false);
  });
});
