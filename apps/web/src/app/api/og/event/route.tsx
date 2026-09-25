import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  formatEventDateTime,
  formatPrice,
  getDirection,
  isLocale,
  type Locale,
} from '@doulisha/i18n';
import { categoryAccents, palette } from '@doulisha/ui-tokens';
import { TRPCError } from '@trpc/server';
import { getTranslations } from 'next-intl/server';
import { ImageResponse } from 'next/og';
import type { CSSProperties } from 'react';
import sharp from 'sharp';

import { visualArabic } from '@/server/og-arabic';
import { apiForLocale } from '@/trpc/server';

/** SHR-02 formats: link preview, square post, story, invitation card. */
const sizes = {
  og: { width: 1200, height: 630 },
  post: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  invitation: { width: 1080, height: 1350 },
} as const;
type Format = keyof typeof sizes;

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

function loadFonts() {
  fonts ??= Promise.all([
    font('inter-latin-400-normal.woff', 'Inter', 400),
    font('inter-latin-700-normal.woff', 'Inter', 700),
    font('playfair-display-latin-700-normal.woff', 'Playfair', 700),
    font('ibm-plex-sans-arabic-arabic-400-normal.woff', 'Plex Arabic', 400),
    font('ibm-plex-sans-arabic-arabic-700-normal.woff', 'Plex Arabic', 700),
  ]);
  return fonts;
}

async function imageDataUrl(path: string | null, appUrl: string): Promise<string | null> {
  if (!path) return null;
  try {
    const source = path.startsWith('/')
      ? await readFile(join(process.cwd(), 'public', ...path.split('/').filter(Boolean)))
      : Buffer.from(await (await fetch(new URL(path, appUrl))).arrayBuffer());
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

const ARABIC = /\p{Script=Arabic}/u;
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
function Line({
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

/**
 * Share images generated from event data (SHR-02), per category colour and in
 * AR/FR/EN. Public and unlisted events only: private events are never rendered.
 * GET /api/og/event?slug=…&format=og|post|story|invitation&locale=fr[&download=1]
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') ?? '';
  const requested = url.searchParams.get('format') ?? 'og';
  const format: Format = requested in sizes ? (requested as Format) : 'og';
  const localeParam = url.searchParams.get('locale') ?? 'fr';
  const locale: Locale = isLocale(localeParam) ? localeParam : 'fr';

  const caller = await apiForLocale(locale);
  const event = await caller.events.bySlug({ slug }).catch((error: unknown) => {
    if (error instanceof TRPCError) return null;
    throw error;
  });
  if (!event) return new Response('Not found', { status: 404 });

  const t = await getTranslations({ locale, namespace: 'Share' });
  const size = sizes[format];
  const accent =
    categoryAccents[event.category.accent as keyof typeof categoryAccents] ??
    categoryAccents.outdoor;
  const cover = await imageDataUrl(event.coverUrl, url.origin);
  const symbol = await imageDataUrl('/images/brand/symbol.png', url.origin);
  const rtl = getDirection(locale) === 'rtl';
  // Satori cannot shape Amiri's Arabic; IBM Plex Sans Arabic renders correctly.
  const titleFont = ARABIC.test(event.title) ? 'Plex Arabic' : 'Playfair';
  const bodyFont = rtl ? 'Plex Arabic' : 'Inter';
  const price =
    event.priceFromMillimes && event.priceFromMillimes > 0
      ? formatPrice(event.priceFromMillimes, locale)
      : t('cardFree');
  const when = formatEventDateTime(event.startsAt, locale);
  const place = [event.city, event.venueName].filter(Boolean).join(' · ');
  const scale = size.width / 1080;
  const invitation = format === 'invitation';

  const image = new ImageResponse(
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        backgroundColor: invitation ? palette.cream : palette.ink,
        fontFamily: bodyFont,
      }}
    >
      {cover && !invitation ? (
        // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>, next/image does not apply here
        <img
          src={cover}
          alt=""
          width={size.width}
          height={size.height}
          style={{ position: 'absolute', inset: 0, objectFit: 'cover' }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          background: invitation
            ? 'transparent'
            : 'linear-gradient(180deg, rgba(0,0,0,0.05) 20%, rgba(0,0,0,0.85) 100%)',
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: invitation ? 'center' : 'flex-end',
          alignItems: invitation ? 'center' : rtl ? 'flex-end' : 'flex-start',
          textAlign: invitation ? 'center' : rtl ? 'right' : 'left',
          width: '100%',
          height: '100%',
          padding: 64 * scale,
          gap: 18 * scale,
          color: invitation ? palette.ink : palette.white,
          border: invitation ? `${14 * scale}px solid ${palette.terracotta}` : 'none',
        }}
      >
        {invitation && cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>
          <img
            src={cover}
            alt=""
            width={640 * scale}
            height={420 * scale}
            style={{ objectFit: 'cover', borderRadius: 32 * scale }}
          />
        ) : null}
        <Line
          text={invitation ? t('cardInvited') : event.category.name}
          style={{
            backgroundColor: invitation ? palette.terracotta : accent.bg,
            color: invitation ? palette.white : accent.fg,
            padding: `${8 * scale}px ${22 * scale}px`,
            borderRadius: 999,
            fontSize: 30 * scale,
            fontWeight: 700,
          }}
        />
        <Line
          text={event.title}
          block
          center={invitation}
          style={{
            fontFamily: titleFont,
            fontSize: (format === 'og' ? 64 : 84) * scale,
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: '100%',
          }}
        />
        <Line
          text={when}
          block
          center={invitation}
          style={{ fontSize: 34 * scale, opacity: 0.92 }}
        />
        {place ? (
          <Line
            text={place}
            block
            center={invitation}
            style={{ fontSize: 30 * scale, opacity: 0.85 }}
          />
        ) : null}
        <div
          style={{
            display: 'flex',
            flexDirection: rtl ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 16 * scale,
            marginTop: 16 * scale,
          }}
        >
          {!invitation ? (
            <Line
              text={price}
              style={{
                backgroundColor: palette.forest,
                color: palette.white,
                padding: `${10 * scale}px ${26 * scale}px`,
                borderRadius: 999,
                fontSize: 32 * scale,
                fontWeight: 700,
              }}
            />
          ) : null}
          {symbol ? (
            // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>
            <img
              src={symbol}
              alt=""
              width={96 * scale}
              height={65 * scale}
              style={{
                backgroundColor: palette.cream,
                borderRadius: 16 * scale,
                padding: 6 * scale,
              }}
            />
          ) : null}
          <Line text={t('cardBook')} style={{ fontSize: 28 * scale, opacity: 0.9 }} />
        </div>
      </div>
    </div>,
    { ...size, fonts: await loadFonts() },
  );
  // Render fully before answering, so a rendering error becomes a clean 500
  // instead of a stream that breaks halfway.
  try {
    // JPEG keeps photo cards small enough for WhatsApp and Facebook previews.
    const png = Buffer.from(await image.arrayBuffer());
    const jpeg = await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    const headers: Record<string, string> = {
      'content-type': 'image/jpeg',
      'cache-control': 'public, max-age=300, s-maxage=3600',
    };
    if (url.searchParams.has('download')) {
      headers['content-disposition'] =
        `attachment; filename="doulisha-${event.slug}-${format}.jpg"`;
    }
    return new Response(new Uint8Array(jpeg), { headers });
  } catch (error) {
    console.error('Share image failed', error);
    return new Response('Image generation failed', { status: 500 });
  }
}
