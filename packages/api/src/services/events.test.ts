import { and } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import {
  escapeLike,
  filterConditions,
  placesLeft,
  publicListingConditions,
  textSearchCondition,
} from './events';

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

describe('filterConditions (DSC-01, DSC-02)', () => {
  const now = new Date('2026-09-24T09:00:00Z');
  const render = (input: Parameters<typeof filterConditions>[0]) =>
    dialect.sqlToQuery(and(...filterConditions(input, now))!);

  it('adds no condition without filters', () => {
    expect(filterConditions({ limit: 10 }, now)).toHaveLength(0);
  });

  it('filters by date preset, price and audience', () => {
    const { sql, params } = render({
      limit: 10,
      when: 'weekend',
      price: 'free',
      audience: ['family'],
    });
    expect(sql).toContain('"events"."starts_at" >= $1');
    expect(sql).toContain('"events"."starts_at" < $2');
    expect(sql).toContain('coalesce("events"."price_from_millimes", 0) = 0');
    expect(sql).toContain('"events"."audience" && $3');
    expect(params[0]).toBe('2026-09-25T17:00:00.000Z');
  });

  it('filters by distance with PostGIS', () => {
    const { sql, params } = render({ limit: 10, near: { lat: 36.8, lng: 10.18, radiusKm: 25 } });
    expect(sql).toContain('ST_DWithin("events"."location"');
    expect(params).toEqual([10.18, 36.8, 25_000]);
  });

  it('keeps only events with places left', () => {
    const { sql } = render({ limit: 10, available: true });
    expect(sql).toContain(
      '"events"."capacity" is null or "events"."places_taken" < "events"."capacity"',
    );
  });
});
