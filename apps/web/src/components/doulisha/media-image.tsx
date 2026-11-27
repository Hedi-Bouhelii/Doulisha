import { mediaSources, type MediaRef, type ResponsiveSlotName } from '@doulisha/storage/delivery';
import Image from 'next/image';

import { cloudName } from '@/lib/media';
import { cn } from '@/lib/utils';

interface MediaImageProps {
  /** The MED image (ADR 0026); shown when set. */
  media: MediaRef | null | undefined;
  /** An older upload or a demo cover in public/images, when there is no media. */
  url?: string | null | undefined;
  /** Display slot of spec 2.5: decides the crop, the quality and the widths offered. */
  slot: ResponsiveSlotName;
  /** How wide the image is drawn at each breakpoint, so the browser picks the right file (Q6). */
  sizes: string;
  alt?: string;
  className?: string;
  /** Above the fold: load at once and with high priority. */
  priority?: boolean;
}

/**
 * An image that fills its positioned parent. MED images are a plain `<img>`
 * with a Cloudinary srcset, never `/_next/image`: one optimizer only (rule Q5).
 * Older URLs keep `next/image`. Renders nothing when there is no image.
 */
export function MediaImage({
  media,
  url,
  slot,
  sizes,
  alt = '',
  className,
  priority = false,
}: MediaImageProps) {
  if (media) {
    const { src, srcSet } = mediaSources(cloudName, media, slot);
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Cloudinary resizes and compresses; next/image would compress again (MED rule Q5)
      <img
        src={src}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={cn('absolute inset-0 size-full', className)}
      />
    );
  }
  if (url) {
    return (
      <Image src={url} alt={alt} fill priority={priority} sizes={sizes} className={className} />
    );
  }
  return null;
}
