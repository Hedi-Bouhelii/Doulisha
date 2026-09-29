import { randomInt } from 'node:crypto';

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

function shortId(length = 5) {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/**
 * URL slug from a title: lowercase ASCII, accents removed, dashes between words,
 * plus a short random suffix so two "Randonnée à Zaghouan" never collide.
 * Titles without Latin letters (Arabic) fall back to "event".
 */
export function makeSlug(title: string, suffix = shortId()): string {
  const base = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return `${base || 'event'}-${suffix}`;
}
