import type { TemplateField } from '@doulisha/templates';
import { describe, expect, it } from 'vitest';

import { templateFacts } from './event-detail';

const l = (text: string) => ({ ar: text, fr: text, en: text });
const fields: TemplateField[] = [
  { key: 'lineup', type: 'text', multiline: true, label: l('Lineup') },
  {
    key: 'genre',
    type: 'select',
    label: l('Genre'),
    options: [{ value: 'dj', label: { ar: 'دي جي', fr: 'DJ set', en: 'DJ set' } }],
  },
  { key: 'difficulty', type: 'number', min: 1, max: 5, label: l('Difficulty') },
  { key: 'distanceKm', type: 'number', unit: 'km', label: l('Distance') },
  { key: 'materialsIncluded', type: 'boolean', label: l('Materials included') },
  { key: 'gpxMediaId', type: 'gpx', label: l('GPX') },
];

describe('templateFacts', () => {
  it('labels filled-in fields and formats their values', () => {
    expect(
      templateFacts(
        fields,
        {
          lineup: ' Emel, DJ Kays ',
          genre: 'dj',
          difficulty: 2,
          distanceKm: 14,
          materialsIncluded: true,
          gpxMediaId: 'x',
        },
        'fr',
      ),
    ).toEqual([
      { key: 'lineup', label: 'Lineup', value: 'Emel, DJ Kays' },
      { key: 'genre', label: 'Genre', value: 'DJ set' },
      { key: 'difficulty', label: 'Difficulty', value: '2 / 5' },
      { key: 'distanceKm', label: 'Distance', value: '14 km' },
      { key: 'materialsIncluded', label: 'Materials included', value: null },
    ]);
  });

  it('skips empty fields and "no" answers', () => {
    expect(templateFacts(fields, { lineup: '  ', materialsIncluded: false }, 'ar')).toEqual([]);
  });
});
