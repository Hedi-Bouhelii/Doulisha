import { describe, expect, it } from 'vitest';

import ar from '../messages/ar.json';
import en from '../messages/en.json';
import fr from '../messages/fr.json';

type Tree = { [key: string]: string | Tree };

function keys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : keys(value, `${prefix}${key}.`),
  );
}

describe('messages', () => {
  const reference = keys(en).sort();

  it.each([
    ['fr', fr],
    ['ar', ar],
  ])('%s has exactly the same keys as en', (_locale, messages) => {
    expect(keys(messages as Tree).sort()).toEqual(reference);
  });

  it('has no empty strings', () => {
    for (const messages of [en, fr, ar]) {
      for (const key of keys(messages as Tree)) {
        const value = key.split('.').reduce<unknown>((node, k) => (node as Tree)[k], messages);
        expect(value, key).not.toBe('');
      }
    }
  });
});
