import { describe, expect, it } from 'vitest';

import {
  fixedMediaUrl,
  fixedSlots,
  maxSlotWidth,
  mediaSources,
  mediaUrl,
  responsiveSlots,
  slotWidths,
  type MediaRef,
} from './delivery';

const photo = (overrides: Partial<MediaRef> = {}): MediaRef => ({
  provider: 'cloudinary',
  key: 'doulisha/dev/event-cover/user-1/abc',
  version: 123,
  format: 'jpg',
  width: 4000,
  height: 3000,
  crop: null,
  ...overrides,
});

describe('srcset widths (Q3, Q6)', () => {
  it('offers the whole ladder when the original is large', () => {
    expect(slotWidths(photo(), 'cover')).toEqual([320, 640, 960, 1280, 1920, 2560]);
    expect(slotWidths(photo(), 'card')).toEqual([320, 480, 640, 800, 960, 1280, 1920, 2560]);
  });

  it('caps the widths at the original and offers the original width', () => {
    expect(slotWidths(photo({ width: 1200, height: 900 }), 'cover')).toEqual([320, 640, 960, 1200]);
  });

  it('never asks a fill crop for more width than the height allows', () => {
    // A 6:1 panorama cut to 16:9 is limited by its 1000 px height.
    const panorama = photo({ width: 6000, height: 1000 });
    expect(maxSlotWidth(panorama, 'cover')).toBe(1777);
    expect(slotWidths(panorama, 'cover').at(-1)).toBe(1777);
    // Limit slots keep the whole image, so only the width counts.
    expect(maxSlotWidth(panorama, 'gallery')).toBe(6000);
  });

  it('measures the cropped image, not the original', () => {
    const avatar = photo({ crop: { x: 1000, y: 200, w: 600, h: 600 } });
    expect(slotWidths(avatar, 'avatar')).toEqual([96, 192, 288, 320, 600]);
  });
});

describe('delivery URLs', () => {
  it('builds a fill URL that never enlarges, with automatic format', () => {
    expect(mediaUrl('demo', photo(), 'cover', 1280)).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_lfill,ar_16:9,g_auto,w_1280/f_auto,q_90:444/v123/doulisha/dev/event-cover/user-1/abc',
    );
    expect(mediaUrl('demo', photo(), 'gallery', 1920)).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_limit,w_1920/f_auto,q_auto:best/v123/doulisha/dev/event-cover/user-1/abc',
    );
  });

  it('applies the stored crop first, in original pixels (Q2)', () => {
    const url = mediaUrl(
      'demo',
      photo({ crop: { x: 10.4, y: 20, w: 900, h: 900 } }),
      'avatar',
      192,
    );
    expect(url).toContain('/c_crop,x_10,y_20,w_900,h_900/c_lfill,ar_1:1,g_face,w_192/');
  });

  it('uses the slot qualities of spec 2.5 and never low or eco ones (Q4)', () => {
    expect(mediaUrl('demo', photo(), 'card', 800)).toContain('/f_auto,q_auto:good/');
    for (const rule of [...Object.values(responsiveSlots), ...Object.values(fixedSlots)]) {
      expect(rule.quality).not.toMatch(/eco|low/);
    }
  });

  it('gives src and srcset for an img element', () => {
    const { src, srcSet } = mediaSources('demo', photo(), 'cover');
    expect(src).toContain('w_1280/');
    expect(srcSet?.split(', ')).toHaveLength(6);
    expect(srcSet).toContain(
      'w_2560/f_auto,q_90:444/v123/doulisha/dev/event-cover/user-1/abc 2560w',
    );
    // A small original falls back to its own width.
    expect(mediaSources('demo', photo({ width: 1000, height: 800 }), 'cover').src).toContain(
      'w_1000/',
    );
  });

  it('cuts share and Open Graph images from the original at their exact size (Q10)', () => {
    expect(fixedMediaUrl('demo', photo(), 'shareStory')).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_1080,h_1920/f_jpg,q_90/v123/doulisha/dev/event-cover/user-1/abc',
    );
    expect(fixedMediaUrl('demo', photo(), 'og')).toContain('/c_fill,g_auto,w_1200,h_630/');
  });

  it('serves local originals as they are (runs without Cloudinary keys)', () => {
    const local = photo({ provider: 'local', key: 'event-cover/user-1/abc', format: 'png' });
    expect(mediaSources('demo', local, 'cover')).toEqual({
      src: '/uploads/event-cover/user-1/abc.png',
      srcSet: undefined,
    });
    expect(fixedMediaUrl('demo', local, 'og')).toBe('/uploads/event-cover/user-1/abc.png');
  });
});
