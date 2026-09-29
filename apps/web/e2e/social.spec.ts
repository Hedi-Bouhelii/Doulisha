import { expect, type Page, test } from '@playwright/test';

import { signInWithPhone } from './helpers';

/**
 * Social sign-in, sign-in methods, story sharing and the legal pages (ADR 0019).
 * Real Google and Facebook sign-in cannot run here: the tests stop at the
 * provider's door and check what Doulisha sends it. Buttons only exist when
 * the provider's keys are set, so those checks skip without keys (CI).
 */

test.describe.configure({ mode: 'serial' });

const EVENT = '/fr/events/randonnee-foret-ain-draham';

/** Stops the browser at Google's sign-in page and returns the address it was sent to. */
async function catchGoogle(page: Page) {
  let sent: URL | null = null;
  await page.route('https://accounts.google.com/**', async (route) => {
    sent = new URL(route.request().url());
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Google</p>' });
  });
  return () => sent;
}

test('sign-up offers Google and Facebook and sends the right return address', async ({ page }) => {
  await page.goto('/fr/sign-up');
  await expect(page.getByTestId('send-code')).toBeVisible();
  const google = page.getByTestId('social-google');
  test.skip((await google.count()) === 0, 'Google keys are not set on this machine');
  await expect(page.getByTestId('social-facebook')).toBeVisible();

  const sent = await catchGoogle(page);
  await page.getByTestId('account-type-organizer').click();
  await google.click();
  await expect.poll(() => sent()?.host).toBe('accounts.google.com');
  expect(sent()!.searchParams.get('redirect_uri')).toBe(
    'http://localhost:3000/api/auth/callback/google',
  );
  expect(sent()!.searchParams.get('scope')).toContain('email');
});

test('a failed social sign-in explains what to do', async ({ page }) => {
  await page.goto('/fr/sign-in?error=account_not_linked');
  await expect(page.getByRole('alert')).toContainText('Mon compte');
  await page.goto('/ar/sign-up?error=access_denied');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

test('"My account" lists the sign-in methods and connects Google', async ({ page }) => {
  await signInWithPhone(page, 'fr', '22000001');
  await page.getByTestId('user-menu').click();
  await page.getByRole('menuitem', { name: 'Mon compte' }).click();
  await expect(page).toHaveURL(/\/fr\/account$/);

  const methods = page.getByTestId('connected-accounts');
  await expect(methods.getByTestId('method-phone')).toContainText('+21622000001');
  await expect(methods.getByTestId('method-password')).toContainText('Défini');

  const connect = page.getByTestId('connect-google');
  test.skip((await connect.count()) === 0, 'Google keys are not set on this machine');
  await expect(methods.getByTestId('method-google')).toContainText('Non relié');
  const sent = await catchGoogle(page);
  await connect.click();
  await expect.poll(() => sent()?.host).toBe('accounts.google.com');
  expect(sent()!.searchParams.get('redirect_uri')).toBe(
    'http://localhost:3000/api/auth/callback/google',
  );
});

test('"My account" works in Arabic and asks visitors to sign in', async ({ page }) => {
  await page.goto('/ar/account');
  await expect(page).toHaveURL(/\/ar\/sign-in\?next=%2Faccount/);
  await signInWithPhone(page, 'ar', '22000001');
  await page.goto('/ar/account');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('حسابي');
  await expect(page.getByTestId('method-phone')).toBeVisible();
});

test('on phones, story images go to the share sheet', async ({ page }) => {
  // A phone that can share files: record what Doulisha hands to the share sheet.
  await page.addInitScript(() => {
    const shared: { name: string; type: string; text: string }[] = [];
    Object.assign(window, { __shared: shared });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: (data: ShareData) => Boolean(data.files?.length),
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (data: ShareData) => {
        const file = data.files?.[0];
        shared.push({ name: file?.name ?? '', type: file?.type ?? '', text: data.text ?? '' });
        return Promise.resolve();
      },
    });
  });
  await page.goto(EVENT);
  await page.getByTestId('share-images').click();
  await page.getByTestId('share-image-story').click();
  const shared = await page.evaluate(
    () =>
      (window as unknown as { __shared: { name: string; type: string; text: string }[] }).__shared,
  );
  expect(shared).toHaveLength(1);
  expect(shared[0]!.name).toBe('doulisha-story.jpg');
  expect(shared[0]!.type).toBe('image/jpeg');
  expect(shared[0]!.text).toContain('utm_source=story');
});

test('without file sharing, images download and the link is copied', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false });
  });
  await page.goto(EVENT);
  await page.getByTestId('share-images').click();
  await expect(page.getByTestId('download-image-story')).toBeVisible();
  await expect(page.getByTestId('share-image-story')).toHaveCount(0);
});

test('privacy, terms and data deletion pages name the contact', async ({ page }) => {
  await page.goto('/fr/privacy');
  await expect(page.getByTestId('legal-privacy')).toContainText('Neon');
  await expect(page.getByRole('link', { name: 'bouhelii.hedi@gmail.com' }).first()).toHaveAttribute(
    'href',
    'mailto:bouhelii.hedi@gmail.com',
  );
  await page.goto('/en/terms');
  await expect(page.getByTestId('legal-terms')).toContainText('Tunisian law');
  await page.goto('/ar/data-deletion');
  await expect(page.getByTestId('legal-dataDeletion')).toContainText('حذف الحساب');
  await page.getByRole('contentinfo').getByRole('link', { name: 'حذف البيانات' }).click();
  await expect(page).toHaveURL(/\/ar\/data-deletion$/);
});
