import { type Browser, expect, type Page, test, type TestInfo } from '@playwright/test';

import { signInWithPhone, signUpFresh } from './helpers';

/**
 * Phase 4b (ADR 0022): the event wall with photos, comments and reactions;
 * report and block; privacy settings on the member page.
 */

test.describe.configure({ mode: 'serial' });

const EVENT = '/fr/events/randonnee-foret-ain-draham';
const SAMI = '22000001';
const YASMINE = '50000001';

// A 1×1 PNG, enough to stand for a photo.
const photo = {
  name: 'sortie.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  ),
};

async function newPage(browser: Browser, info: TestInfo): Promise<Page> {
  const { viewport, userAgent, isMobile, hasTouch, deviceScaleFactor } = info.project.use;
  const context = await browser.newContext({
    viewport,
    userAgent,
    isMobile,
    hasTouch,
    deviceScaleFactor,
  });
  return context.newPage();
}

/** Posts on the wall once the composer is interactive (typing before hydration is lost). */
async function postOnWall(page: Page, text: string) {
  const input = page.getByTestId('wall-input');
  const send = page.getByTestId('wall-send');
  await expect(async () => {
    await input.fill(text);
    await expect(send).toBeEnabled({ timeout: 1000 });
  }).toPass();
  await send.click();
}

const stampOf = (info: TestInfo) => `${Date.now().toString(36)}${info.project.name[0]}`;

test('visitors read the wall and are asked to sign in to post', async ({ page }) => {
  await page.goto(EVENT);
  await expect(page.getByTestId('event-wall')).toBeVisible();
  await expect(page.getByTestId('wall-sign-in')).toHaveAttribute(
    'href',
    /\/fr\/sign-in\?next=%2Fevents%2Frandonnee/,
  );
  await expect(page.getByTestId('wall-input')).toHaveCount(0);
});

test('members post with a photo; the organizer comments and reacts', async ({
  page,
  browser,
}, info) => {
  test.setTimeout(240_000);
  const stamp = stampOf(info);
  await signUpFresh(page, `Randonneuse ${stamp}`);
  await page.goto(EVENT);
  await page.getByTestId('wall-photos').setInputFiles(photo);
  await postOnWall(page, `Qui covoiture depuis Tunis ? ${stamp}`);
  const post = page.getByTestId('wall-post').filter({ hasText: stamp });
  await expect(post).toBeVisible();
  await expect(post.getByTestId('wall-photo')).toHaveCount(1);
  await expect(page.getByTestId('wall-input')).toHaveValue('');

  const sami = await newPage(browser, info);
  await signInWithPhone(sami, 'fr', SAMI);
  await sami.goto(EVENT);
  const seen = sami.getByTestId('wall-post').filter({ hasText: stamp });
  await seen.getByTestId('react-fire').first().click();
  await expect(seen.getByTestId('react-fire').first()).toHaveAttribute('aria-pressed', 'true');
  await seen.getByTestId('comment-input').fill(`Deux places depuis l’Ariana ${stamp}`);
  await seen.getByTestId('comment-send').click();
  const comment = seen.getByTestId('wall-comment').filter({ hasText: 'Ariana' });
  await expect(comment).toContainText('Organisateur');
  await sami.context().close();

  await page.reload();
  const updated = page.getByTestId('wall-post').filter({ hasText: stamp });
  // The post's own reaction bar comes before its comments' bars.
  await expect(updated.getByTestId('react-fire').first()).toContainText('1');
  await expect(updated.getByTestId('wall-comment')).toContainText('Ariana');

  // The author can delete their own post.
  await updated.getByTestId('item-menu').first().click();
  await page.getByTestId('item-remove').click();
  await expect(page.getByTestId('wall-post').filter({ hasText: stamp })).toHaveCount(0);
});

test('a member reports an event and blocks someone', async ({ page, browser }, info) => {
  test.setTimeout(240_000);
  const stamp = stampOf(info);
  // A new member posts an advert on the wall.
  const poster = await newPage(browser, info);
  const posterName = await signUpFresh(poster, `Vendeur ${stamp}`);
  await poster.goto(EVENT);
  await postOnWall(poster, `Promo sur mes randonnées ${stamp}`);
  await expect(poster.getByTestId('wall-post').filter({ hasText: stamp })).toBeVisible();
  await poster.context().close();

  await signInWithPhone(page, 'fr', YASMINE);
  await page.goto(EVENT);
  await page.getByTestId('report-event').click();
  await page.getByTestId('report-reason-scam').click();
  await page.getByTestId('report-details').fill(`Test ${stamp}`);
  await page.getByTestId('report-send').click();
  await expect(page.getByTestId('report-sent')).toBeVisible();
  await page.keyboard.press('Escape');

  const post = page.getByTestId('wall-post').filter({ hasText: stamp });
  await post.getByTestId('item-menu').first().click();
  await page.getByTestId('item-block').click();
  await page.getByTestId('block-confirm').click();
  await expect(page.getByTestId('wall-post').filter({ hasText: stamp })).toHaveCount(0);

  // "My account" lists her; unblocking brings her posts back.
  await page.goto('/fr/account');
  const blocked = page.getByTestId('blocked-list');
  const row = blocked.getByRole('listitem').filter({ hasText: posterName });
  await expect(row).toBeVisible();
  await row.getByTestId('unblock').click();
  await expect(blocked).not.toContainText(posterName);
  await page.goto(EVENT);
  await expect(page.getByTestId('wall-post').filter({ hasText: stamp })).toBeVisible();
});

test('a private profile shows only the name and photo', async ({ page, browser }, info) => {
  test.setTimeout(240_000);
  await signInWithPhone(page, 'fr', YASMINE);
  await page.goto('/fr/account');
  const profileUrl = await page
    .getByTestId('privacy-settings')
    .getByRole('link', { name: 'Voir ma page' })
    .getAttribute('href');
  expect(profileUrl).toMatch(/\/fr\/members\/[0-9a-f-]+$/);

  await page.getByTestId('profile-private').click();
  await page.getByTestId('privacy-save').click();
  await expect(page.getByTestId('privacy-saved')).toBeVisible();

  const visitor = await newPage(browser, info);
  await visitor.goto(profileUrl!);
  await expect(visitor.getByTestId('member-private')).toBeVisible();
  await expect(visitor.getByTestId('member-attending')).toHaveCount(0);

  await page.getByTestId('profile-public').click();
  await page.getByTestId('privacy-save').click();
  await expect(page.getByTestId('privacy-saved')).toBeVisible();
  await visitor.reload();
  await expect(visitor.getByTestId('member-private')).toHaveCount(0);
  await expect(visitor.getByTestId('member-attending')).toBeVisible();
  await visitor.context().close();
});
