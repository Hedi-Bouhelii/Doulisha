import { expect, test } from '@playwright/test';
import sharp from 'sharp';

import { createPublishedHike, signInWithPhone } from './helpers';

/**
 * Module MED (spec section 2, ADR 0026): covers are uploaded as they are and
 * shown by the storage only. Without Cloudinary keys the app stores files on
 * local disk and serves the original; with keys, Cloudinary sizes them.
 */

/** Seeded organizer of Kroumirie Trekkers. */
const SAMI = '22000001';

/** A JPEG of the given size, with stripes like the fine detail of a poster. */
async function photo(width: number, height: number) {
  const stripes = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#2d5a27"/>
      ${Array.from({ length: 40 }, (_, i) => `<rect x="${i * 60}" width="20" height="${height}" fill="#f5f0e8"/>`).join('')}
    </svg>`,
  );
  const buffer = await sharp(stripes).jpeg({ quality: 95 }).toBuffer();
  return { name: `cover-${width}.jpg`, mimeType: 'image/jpeg', buffer };
}

test('an uploaded cover is shown sharp and never through the Next.js optimizer (T3, T4, T6)', async ({
  page,
}) => {
  const optimized: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    // MED files: Cloudinary URLs, or local files under the environment folder.
    if (url.includes('/_next/image') && /cloudinary|uploads%2Fdoulisha%2F/.test(url)) {
      optimized.push(url);
    }
  });

  await signInWithPhone(page, 'fr', SAMI);
  await createPublishedHike(page, 'fr', {
    title: `Randonnée photo ${Date.now()}`,
    cover: await photo(2400, 1350),
  });

  const cover = page.getByTestId('event-cover').locator('img');
  await expect(cover).toBeVisible();
  await expect
    .poll(() => cover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
    .toBeGreaterThan(0);
  // With a srcset, naturalWidth is divided by the pixel density: measure the
  // file the browser chose (currentSrc) instead.
  const { natural, rendered } = await cover.evaluate(async (img: HTMLImageElement) => {
    const chosen = new Image();
    chosen.src = img.currentSrc || img.src;
    await chosen.decode();
    return { natural: chosen.naturalWidth, rendered: img.getBoundingClientRect().width };
  });
  // T3/T4: at least twice the drawn width, or the whole original when smaller.
  expect(natural).toBeGreaterThanOrEqual(Math.min(2 * rendered, 2400) - 1);
  expect(optimized).toEqual([]);
});

test('a narrow cover gets a warning and a file over 10 MB is refused (Q8)', async ({ page }) => {
  await signInWithPhone(page, 'fr', SAMI);
  await page.goto('/fr/organizer/events/new');
  await page.getByTestId('template-hiking_trip').click();
  await page.waitForURL(/\/organizer\/events\/[0-9a-f-]+\/edit$/);
  await page.getByTestId('wizard-title').fill(`Couverture étroite ${Date.now()}`);

  const input = page.locator('input[type="file"]');
  await input.setInputFiles(await photo(800, 450));
  await expect(page.getByTestId('cover-preview').locator('img')).toBeVisible();
  await expect(page.getByTestId('cover-low-resolution')).toContainText('800 px');

  await input.setInputFiles({
    name: 'trop-grande.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(11 * 1024 * 1024),
  });
  await expect(page.getByText('Ce fichier dépasse 10 Mo.')).toBeVisible();
});
