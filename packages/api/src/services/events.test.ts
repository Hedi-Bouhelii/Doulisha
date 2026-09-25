import { and } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { escapeLike, placesLeft, publicListingConditions, textSearchCondition } from './events';

const dialect = new PgDialect({ casing: 'snake_case' });

describe('placesLeft', () => {
  it('computes remaining places and never goes below zero', () => {
    expect(placesLeft(25, 18)).toBe(7);
    expect(placesLeft(10, 12)).toBe(0);
  });

  it('is null for events without a capacity', () => {
    expect(placesLeft(null, 40)).toBeNull();
  });
});

describe('publicListingConditions', () => {
  it('lists only public, published, non-deleted, future events', () => {
    const { sql, params } = dialect.sqlToQuery(
      and(...publicListingConditions(new Date('2026-10-01T00:00:00Z')))!,
    );
    expect(sql).toContain('"events"."visibility" = $1');
    expect(sql).toContain('"events"."status" in ($2, $3)');
    expect(sql).toContain('"events"."deleted_at" is null');
    expect(sql).toContain('"events"."starts_at" > $4');
    expect(params.slice(0, 3)).toEqual(['public', 'published', 'full']);
  });
});

describe('text search', () => {
  it('escapes LIKE wildcards', () => {
    expect(escapeLike('100%_off')).toBe(String.raw`100\%\_off`);
  });

  it('matches title or city, ignoring accents and case', () => {
    const { sql, params } = dialect.sqlToQuery(textSearchCondition('  Aïn Draham '));
    expect(sql).toContain(
      'immutable_unaccent(lower("events"."title")) like immutable_unaccent(lower($1))',
    );
    expect(sql).toContain('"events"."city"');
    expect(params[0]).toBe('%Aïn Draham%');
  });
});
