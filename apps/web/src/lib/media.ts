import { fixedMediaUrl, type FixedSlotName, type MediaRef } from '@doulisha/storage/delivery';

import { absoluteUrl } from './site';

/** Inlined at build time; empty without Cloudinary (local files need no cloud name). */
export const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';

/**
 * Absolute URL of an image for other sites (JSON-LD, Open Graph): the MED
 * media cut to `slot` from the original (Q10), or an older URL as it is.
 */
export function externalImageUrl(
  media: MediaRef | null | undefined,
  url: string | null | undefined,
  slot: FixedSlotName = 'og',
): string | undefined {
  const source = media ? fixedMediaUrl(cloudName, media, slot) : url;
  if (!source) return undefined;
  return source.startsWith('http') ? source : absoluteUrl(source);
}
