import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { contrastRatio } from './contrast';
import { generateTokensCss } from './css';
import { categoryAccents, palette, themes } from './tokens';

const AA_TEXT = 4.5;
const AA_LARGE_OR_UI = 3;

describe('WCAG AA contrast', () => {
  for (const [name, t] of Object.entries(themes)) {
    describe(`${name} theme`, () => {
      const pairs: [string, string, string][] = [
        ['foreground on background', t.foreground, t.background],
        ['foreground on card', t.cardForeground, t.card],
        ['muted text on background', t.mutedForeground, t.background],
        ['muted text on muted', t.mutedForeground, t.muted],
        ['primary button', t.primaryForeground, t.primary],
        ['highlight button', t.highlightForeground, t.highlight],
        ['secondary button', t.secondaryForeground, t.secondary],
        ['destructive button', t.destructiveForeground, t.destructive],
        ['primary text on background', t.primary, t.background],
        ['highlight text on background', t.highlight, t.background],
      ];
      for (const [label, fg, bg] of pairs) {
        it(`${label} is at least ${AA_TEXT}:1`, () => {
          expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
        });
      }
      it('focus ring is visible on the background (3:1)', () => {
        expect(contrastRatio(t.ring, t.background)).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
      });
    });
  }

  it('category tiles are readable', () => {
    for (const c of Object.values(categoryAccents)) {
      expect(contrastRatio(c.fg, c.bg)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(c.solid, c.bg)).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
    }
  });

  it('documents why the template terracotta is decorative only', () => {
    expect(contrastRatio(palette.terracotta, palette.cream)).toBeLessThan(AA_TEXT);
    expect(contrastRatio(palette.white, palette.terracottaStrong)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe('tokens.css', () => {
  it('is in sync with the TypeScript tokens (run build:css after changing them)', () => {
    const committed = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8');
    expect(committed).toBe(generateTokensCss());
  });
});
