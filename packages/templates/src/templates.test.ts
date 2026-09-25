import { describe, expect, it } from 'vitest';

import { categories } from './categories';
import { templateDefinitions } from './definitions';
import { buildDetailsSchema } from './details-schema';

const hiking = templateDefinitions.find((t) => t.key === 'hiking_trip');

describe('template catalogue', () => {
  it('has unique template keys and category slugs', () => {
    const keys = templateDefinitions.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    const slugs = categories.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('points every template at an existing category', () => {
    const slugs = new Set(categories.map((c) => c.slug));
    for (const t of templateDefinitions) expect(slugs.has(t.categorySlug)).toBe(true);
  });

  it('only exposes existing fields as search filters', () => {
    for (const t of templateDefinitions) {
      const fieldKeys = new Set(t.definition.fields.map((f) => f.key));
      for (const filter of t.definition.searchFilters) expect(fieldKeys.has(filter)).toBe(true);
    }
  });

  it('activates only the MVP launch verticals (spec 11.1)', () => {
    const activeModels = new Set(templateDefinitions.filter((t) => t.isActive).map((t) => t.model));
    expect(activeModels.has('slot_booking')).toBe(false);
    expect(activeModels).toEqual(new Set(['ticketed', 'group_trip', 'private']));
  });
});

describe('buildDetailsSchema', () => {
  it('accepts valid hiking details', () => {
    const schema = buildDetailsSchema(hiking!.definition);
    expect(schema.safeParse({ difficulty: 3, distanceKm: 12.5, elevationM: 640 }).success).toBe(
      true,
    );
  });

  it('rejects missing required fields, out-of-range values and unknown keys', () => {
    const schema = buildDetailsSchema(hiking!.definition);
    expect(schema.safeParse({ distanceKm: 10 }).success).toBe(false);
    expect(schema.safeParse({ difficulty: 6 }).success).toBe(false);
    expect(schema.safeParse({ difficulty: 2.5 }).success).toBe(false);
    expect(schema.safeParse({ difficulty: 2, colour: 'red' }).success).toBe(false);
  });

  it('checks select options', () => {
    const workshop = templateDefinitions.find((t) => t.key === 'workshop_class')!;
    const schema = buildDetailsSchema(workshop.definition);
    expect(schema.safeParse({ level: 'beginner' }).success).toBe(true);
    expect(schema.safeParse({ level: 'expert' }).success).toBe(false);
  });
});
