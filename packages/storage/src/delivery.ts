/**
 * Delivery URLs for stored images (module MED, spec 2.4 and 2.5, ADR 0026).
 * The database keeps the public id and metadata, never a URL: every URL is
 * built here, at render time, for the slot the image is shown in.
 *
 * Browser-safe (no Node APIs): server and client components both use it.
 */

/** Crop rectangle in pixels of the original (spec 2.3, rule Q2). */
export interface MediaCrop {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What the database knows about a stored image. */
export interface MediaRef {
  provider: 'cloudinary' | 'local';
  /** Cloudinary public id, or the local file's key; no extension. */
  key: string;
  version: number | null;
  /** Format of the original, e.g. "jpg", "heic". */
  format: string;
  width: number;
  height: number;
  crop: MediaCrop | null;
}

/** Spec rule Q4: low and eco qualities are forbidden. */
type Quality = 'q_auto:best' | 'q_auto:good' | 'q_90' | 'q_90:444';

interface ResponsiveSlot {
  /** `fill` cuts the image to `aspect`; `limit` keeps the whole image. */
  mode: 'fill' | 'limit';
  aspect?: readonly [number, number];
  gravity?: 'auto' | 'face' | 'center';
  quality: Quality;
  /** The slot's widths from spec 2.5, merged with the srcset ladder (Q6). */
  widths: readonly number[];
}

interface FixedSlot {
  width: number;
  height: number;
  quality: Quality;
}

/** Spec rule Q6: every image offers these widths, capped at the original. */
export const SRCSET_LADDER = [320, 640, 960, 1280, 1920, 2560] as const;

/** Display slots (spec 2.5; ADR 0026 explains the qualities). */
export const responsiveSlots = {
  /** Event page cover, up to 1,200 px wide. Every cover may carry text (Q4). */
  cover: {
    mode: 'fill',
    aspect: [16, 9],
    gravity: 'auto',
    quality: 'q_90:444',
    widths: [1280, 1920, 2560],
  },
  /** Event cards in lists and Explore, 360 to 420 px wide. */
  card: {
    mode: 'fill',
    aspect: [4, 3],
    gravity: 'auto',
    quality: 'q_auto:good',
    widths: [480, 800, 960],
  },
  /** Full-screen gallery. */
  gallery: { mode: 'limit', quality: 'q_auto:best', widths: [1280, 1920, 2560] },
  /** Organizer page banner: kept whole, the wide box crops it in CSS. */
  banner: { mode: 'limit', quality: 'q_auto:best', widths: [1280, 1920, 2560] },
  /** Member photos, 48 to 96 px. */
  avatar: {
    mode: 'fill',
    aspect: [1, 1],
    gravity: 'face',
    quality: 'q_auto:good',
    widths: [96, 192, 288],
  },
  /** Organizer logos, 48 to 96 px. */
  logo: {
    mode: 'fill',
    aspect: [1, 1],
    gravity: 'center',
    quality: 'q_auto:good',
    widths: [96, 192, 288],
  },
  /** Square event thumbnails in lists (56 to 72 px), sized like avatars. */
  thumb: {
    mode: 'fill',
    aspect: [1, 1],
    gravity: 'auto',
    quality: 'q_auto:good',
    widths: [96, 192, 288],
  },
} as const satisfies Record<string, ResponsiveSlot>;

/** Generated images of a fixed size (Q10: always cut from the original). */
export const fixedSlots = {
  sharePost: { width: 1080, height: 1080, quality: 'q_90' },
  shareStory: { width: 1080, height: 1920, quality: 'q_90' },
  og: { width: 1200, height: 630, quality: 'q_90' },
} as const satisfies Record<string, FixedSlot>;

export type ResponsiveSlotName = keyof typeof responsiveSlots;
export type FixedSlotName = keyof typeof fixedSlots;

/** Size of the image once the stored crop is applied. */
export function croppedSize(media: Pick<MediaRef, 'width' | 'height' | 'crop'>) {
  return media.crop
    ? { width: media.crop.w, height: media.crop.h }
    : { width: media.width, height: media.height };
}

/**
 * The widest image a slot can deliver without enlarging (Q3): the cropped
 * width, or less when a fill crop is limited by the height.
 */
export function maxSlotWidth(
  media: Pick<MediaRef, 'width' | 'height' | 'crop'>,
  slot: ResponsiveSlotName,
) {
  const { width, height } = croppedSize(media);
  const rule: ResponsiveSlot = responsiveSlots[slot];
  if (rule.mode === 'limit' || !rule.aspect) return width;
  const [w, h] = rule.aspect;
  return Math.max(1, Math.min(width, Math.floor((height * w) / h)));
}

/**
 * Widths offered in the srcset: the Q6 ladder and the slot's widths, never
 * above what the original allows; the largest available size is always offered.
 */
export function slotWidths(
  media: Pick<MediaRef, 'width' | 'height' | 'crop'>,
  slot: ResponsiveSlotName,
) {
  const max = maxSlotWidth(media, slot);
  const wanted: number[] = [...new Set([...SRCSET_LADDER, ...responsiveSlots[slot].widths])].sort(
    (a, b) => a - b,
  );
  const widths = wanted.filter((w) => w < max);
  if (wanted.some((w) => w >= max)) widths.push(max);
  return widths;
}

function cropStep(crop: MediaCrop | null) {
  if (!crop) return null;
  const n = (v: number) => Math.max(0, Math.round(v));
  return `c_crop,x_${n(crop.x)},y_${n(crop.y)},w_${Math.max(1, n(crop.w))},h_${Math.max(1, n(crop.h))}`;
}

function cloudinaryUrl(cloudName: string, media: MediaRef, steps: (string | null)[]) {
  const version = media.version ? `v${media.version}/` : '';
  const path = steps.filter(Boolean).join('/');
  return `https://res.cloudinary.com/${cloudName}/image/upload/${path}/${version}${media.key}`;
}

/** The local provider stores originals only (CI and E2E without Cloudinary keys). */
function localUrl(media: MediaRef) {
  return `/uploads/${media.key}.${media.format}`;
}

/** URL of one width of a responsive slot. `width` should come from `slotWidths`. */
export function mediaUrl(
  cloudName: string,
  media: MediaRef,
  slot: ResponsiveSlotName,
  width: number,
) {
  if (media.provider === 'local') return localUrl(media);
  const rule: ResponsiveSlot = responsiveSlots[slot];
  const w = Math.max(1, Math.round(width));
  // c_lfill and c_limit only scale down, never up (Q3).
  const resize =
    rule.mode === 'fill' && rule.aspect
      ? `c_lfill,ar_${rule.aspect[0]}:${rule.aspect[1]},g_${rule.gravity ?? 'auto'},w_${w}`
      : `c_limit,w_${w}`;
  return cloudinaryUrl(cloudName, media, [cropStep(media.crop), resize, `f_auto,${rule.quality}`]);
}

/** `src` and `srcSet` for an `<img>` in a responsive slot. */
export function mediaSources(cloudName: string, media: MediaRef, slot: ResponsiveSlotName) {
  if (media.provider === 'local') return { src: localUrl(media), srcSet: undefined };
  const widths = slotWidths(media, slot);
  const srcSet = widths.map((w) => `${mediaUrl(cloudName, media, slot, w)} ${w}w`).join(', ');
  // Fallback for browsers without srcset: the slot's first width, or smaller.
  const fallback = widths.find((w) => w >= responsiveSlots[slot].widths[0]!) ?? widths.at(-1)!;
  return { src: mediaUrl(cloudName, media, slot, fallback), srcSet };
}

/**
 * URL of a generated image of fixed size (share post and story, Open Graph):
 * cut from the original, never from a displayed thumbnail (Q10).
 */
export function fixedMediaUrl(cloudName: string, media: MediaRef, slot: FixedSlotName) {
  if (media.provider === 'local') return localUrl(media);
  const rule: FixedSlot = fixedSlots[slot];
  return cloudinaryUrl(cloudName, media, [
    cropStep(media.crop),
    `c_fill,g_auto,w_${rule.width},h_${rule.height}`,
    `f_jpg,${rule.quality}`,
  ]);
}
