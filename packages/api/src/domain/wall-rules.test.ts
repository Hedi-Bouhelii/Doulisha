import { describe, expect, it } from 'vitest';

import { canRemoveWallItem, tallyReactions, wallOpen } from './wall-rules';

describe('which events have a wall', () => {
  const event = { visibility: 'public', status: 'published', deletedAt: null };

  it('public and unlisted events, while published, full or over', () => {
    expect(wallOpen(event)).toBe(true);
    expect(wallOpen({ ...event, visibility: 'unlisted' })).toBe(true);
    expect(wallOpen({ ...event, status: 'full' })).toBe(true);
    expect(wallOpen({ ...event, status: 'completed' })).toBe(true);
  });

  it('never private events, drafts, cancelled or deleted events', () => {
    expect(wallOpen({ ...event, visibility: 'private' })).toBe(false);
    expect(wallOpen({ ...event, status: 'draft' })).toBe(false);
    expect(wallOpen({ ...event, status: 'cancelled' })).toBe(false);
    expect(wallOpen({ ...event, deletedAt: new Date() })).toBe(false);
  });
});

describe('removing a post or comment', () => {
  it('is allowed to the author and to the organizers', () => {
    expect(canRemoveWallItem({ actorId: 'a', authorId: 'a', managesEvent: false })).toBe(true);
    expect(canRemoveWallItem({ actorId: 'o', authorId: 'a', managesEvent: true })).toBe(true);
  });

  it('is refused to anyone else', () => {
    expect(canRemoveWallItem({ actorId: 'b', authorId: 'a', managesEvent: false })).toBe(false);
  });
});

describe('reaction tallies', () => {
  it('count each kind and find the viewer’s own', () => {
    const tally = tallyReactions(
      [
        { userId: 'a', kind: 'like' },
        { userId: 'b', kind: 'like' },
        { userId: 'c', kind: 'fire' },
      ],
      'c',
    );
    expect(tally).toEqual({ counts: { like: 2, fire: 1 }, mine: 'fire', total: 3 });
    expect(tallyReactions([], null)).toEqual({ counts: {}, mine: null, total: 0 });
  });
});
