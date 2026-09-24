import { PgDialect } from 'drizzle-orm/pg-core';
import { and } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { placesLeft, publicListingConditions } from './events';

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
    const { sql, params } = new PgDialect({ casing: 'snake_case' }).sqlToQuery(
      and(...publicListingConditions(new Date('2026-10-01T00:00:00Z')))!,
    );
    expect(sql).toContain('"events"."visibility" = $1');
    expect(sql).toContain('"events"."status" in ($2, $3)');
    expect(sql).toContain('"events"."deleted_at" is null');
    expect(sql).toContain('"events"."starts_at" > $4');
    expect(params.slice(0, 3)).toEqual(['public', 'published', 'full']);
  });
});
