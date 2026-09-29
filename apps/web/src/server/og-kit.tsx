import { readFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

import type { CSSProperties } from 'react';
import sharp from 'sharp';

import { visualArabic } from './og-arabic';

/**
 * Shared by the images drawn with next/og (Satori): share images (SHR-02) and
 * PDF tickets (TKT-04). Fonts, safe image loading and Arabic line layout.
 */

const fontDir = join(process.cwd(), 'src', 'server', 'og-fonts');
let fonts: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 700 }[]> | undefined;

/** Satori needs each font as an ArrayBuffer (not a Node Buffer). */
async function font(file: string, name: string, weight: 400 | 700) {
  const data = await readFile(join(fontDir, file));
  return {
    name,
    weight,
    data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
  };
}

export function loadFonts() {
  fonts ??= Promise.all([
    font('inter-latin-400-normal.woff', 'Inter', 400),
    font('inter-latin-700-normal.woff', 'Inter', 700),
    font('playfair-display-latin-700-normal.woff', 'Playfair', 700),
    font('ibm-plex-sans-arabic-arabic-400-normal.woff', 'Plex Arabic', 400),
    font('ibm-plex-sans-arabic-arabic-700-normal.woff', 'Plex Arabic', 700),
  ]);
  return fonts;
}

const publicDir = join(process.cwd(), 'public');

/**
 * Loads a cover or the logo from /public only. Never fetches a URL: covers are
 * checked uploads (coverUrlFromKey), and reading from disk keeps this route
 * from being used to reach other hosts. R2 covers arrive in Phase 6.
 */
export async function imageDataUrl(path: string | null): Promise<string | null> {
  if (!path?.startsWith('/') || path.includes('..')) return null;
  try {
    const file = resolve(publicDir, ...path.split('?')[0]!.split('/').filter(Boolean));
    if (!file.startsWith(publicDir + sep)) return null;
    const source = await readFile(file);
    if (path.endsWith('.png')) return `data:image/png;base64,${source.toString('base64')}`;
    // Satori reads PNG and JPEG only; covers are WebP, so convert (and shrink) first.
    const jpeg = await sharp(source)
      .resize({ width: 1080, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
  } catch {
    return null;
  }
}

export const ARABIC = /\p{Script=Arabic}/u;
const LATIN = /\p{Script=Latin}/u;

/**
 * Satori has no bidirectional layout: it places words left to right, so Arabic
 * reads backwards. Split into words (keeping Latin runs such as a venue name
 * together) and let a row-reverse flexbox order them right to left.
 */
function rtlChunks(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;
    if (!LATIN.test(word)) {
      chunks.push(word);
      continue;
    }
    let end = i;
    for (let j = i + 1; j < words.length && !ARABIC.test(words[j]!); j++) {
      if (LATIN.test(words[j]!)) end = j;
    }
    chunks.push(words.slice(i, end + 1).join(' '));
    i = end;
  }
  return chunks;
}

/** A line of text that renders Arabic in the right order. `block` lets it wrap across the card. */
export function Line({
  text,
  style,
  block,
  center,
}: {
  text: string;
  style: CSSProperties;
  block?: boolean;
  center?: boolean;
}) {
  if (!ARABIC.test(text)) return <div style={{ ...style, display: 'flex' }}>{text}</div>;
  const fontSize = typeof style.fontSize === 'number' ? style.fontSize : 32;
  return (
    <div
      style={{
        ...style,
        display: 'flex',
        flexDirection: 'row-reverse',
        flexWrap: block ? 'wrap' : 'nowrap',
        flexShrink: block ? 1 : 0,
        justifyContent: center ? 'center' : 'flex-start',
        columnGap: fontSize * 0.32,
        ...(block ? { width: '100%' } : {}),
      }}
    >
      {rtlChunks(text).map((chunk, index) => (
        <span key={index}>{ARABIC.test(chunk) ? visualArabic(chunk) : chunk}</span>
      ))}
    </div>
  );
}
