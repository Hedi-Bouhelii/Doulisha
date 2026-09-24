import { expect, test } from '@playwright/test';

import { readOutbox, signInWithPhone } from './helpers';

/**
 * Phase 1 acceptance (BUILD_PROMPT section 8, web only):
 * sign up and sign in; switch to Arabic and the layout flips;
 * seed data visible in an admin table.
 */

test.describe.configure({ mode: 'serial' });

test('a new member signs up with phone OTP and chooses a name', async ({ page }) => {
  // A random 8-digit Tunisian mobile number starting with 9 (not used by the seed).
  const localPhone = `9${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;
  await signInWithPhone(page, 'fr', localPhone);

  await expect(page.locator('#name')).toBeVisible();
  await page.locator('#name').fill('Testeur Playwright');
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page).toHaveURL(/\/fr$/);
  await expect(page.getByTestId('user-menu')).toBeVisible();
});

test('the seeded admin sees seed data in the admin table', async ({ page }) => {
  await signInWithPhone(page, 'fr', '20000001');
  await expect(page.getByTestId('user-menu')).toBeVisible();

  await page.goto('/fr/admin');
  await expect(page.getByTestId('admin-tables')).toContainText('events');
  const rows = page.getByTestId('admin-rows');
  await expect(rows).toContainText('randonnee-foret-ain-draham');
  await expect(rows).toContainText('live-music-night-la-marsa');
});

test('switching to Arabic flips the layout to right-to-left', async ({ page }) => {
  await page.goto('/fr');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await page.getByTestId('locale-switcher').click();
  await page.getByTestId('locale-ar').click();

  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('اكتشف');
});

test('visitors are sent to sign in before the back office', async ({ page }) => {
  await page.goto('/en/admin');
  await expect(page).toHaveURL(/\/en\/sign-in\?next=%2Fadmin|\/en\/sign-in\?next=\/admin/);
});

test('private and draft events are never reachable publicly', async ({ page }) => {
  for (const slug of ['les-30-ans-de-yasmine', 'kayak-bizerte-brouillon']) {
    const response = await page.goto(`/fr/events/${slug}`);
    expect(response?.status()).toBe(404);
  }
  await page.goto('/fr/explore');
  await expect(page.getByText('Les 30 ans de Yasmine')).toHaveCount(0);
  await expect(page.getByText('Randonnée à Rtiba')).toHaveCount(0);
});

test('a member signs in with an email magic link', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.tn`;
  await page.goto('/en/sign-in');
  await page.getByRole('tab', { name: 'Email' }).click();
  await page.locator('#email').fill(email);
  const since = Date.now() - 1000;
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByRole('status')).toContainText(email);

  const link = await readOutbox(page, {
    channel: 'email',
    to: email,
    since,
    pattern: /https?:\/\/\S+/,
  });
  await page.goto(link);
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByTestId('user-menu')).toBeVisible();
});

test('guests can get an anonymous session for RSVP without an account', async ({ request }) => {
  const response = await request.post('/api/auth/sign-in/anonymous', {
    headers: { origin: 'http://localhost:3000' },
    data: {},
  });
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { user: { isAnonymous: boolean; email: string } };
  expect(body.user.isAnonymous).toBe(true);
  expect(body.user.email).toMatch(/@guest\.doulisha\.invalid$/);
});
