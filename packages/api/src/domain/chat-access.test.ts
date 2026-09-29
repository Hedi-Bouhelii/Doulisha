import { describe, expect, it } from 'vitest';

import { chatRole, type ChatContext } from './chat-access';

const thread: ChatContext = {
  kind: 'organizer',
  memberId: 'amel',
  managesEvent: false,
  hasGroupRsvp: false,
};
const group: ChatContext = {
  kind: 'group',
  memberId: null,
  managesEvent: false,
  hasGroupRsvp: false,
};

describe('organizer threads', () => {
  it('belong to the participant who asked and to the organizers', () => {
    expect(chatRole('amel', thread)).toBe('member');
    expect(chatRole('sami', { ...thread, managesEvent: true })).toBe('organizer');
  });

  it('stay closed to other participants', () => {
    expect(chatRole('karim', thread)).toBeNull();
    expect(chatRole('karim', { ...thread, hasGroupRsvp: true })).toBeNull();
  });
});

describe('private event group chats', () => {
  it('include hosts and guests who answered going or maybe', () => {
    expect(chatRole('host', { ...group, managesEvent: true })).toBe('organizer');
    expect(chatRole('guest', { ...group, hasGroupRsvp: true })).toBe('member');
  });

  it('exclude everyone else', () => {
    expect(chatRole('stranger', group)).toBeNull();
  });
});
