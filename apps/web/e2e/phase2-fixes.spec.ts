import { expect, test } from '@playwright/test';

import { createPublishedHike, E2E_PASSWORD, enterCode, signInWithPhone } from './helpers';

/**
 * Founder review of Phase 2: sign-up with a password and an account type,
 * organizer onboarding prefilled from the account, D17 bookings that show
 * only the D17 instructions.
 */

test.describe.configure({ mode: 'serial' });

const randomPhone = () => `9${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;

test('an organizer signs up, finds the profile prefilled and completes it', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const phone = randomPhone();
  const name = `Club E2E ${Date.now().toString(36)}${info.project.name[0]}`;

  await page.goto('/fr/sign-up');
  await page.getByTestId('account-type-organizer').click();
  await page.locator('#phone').fill(phone);
  const since = Date.now() - 1000;
  await page.getByTestId('send-code').click();
  await enterCode(page, 'sms', `+216${phone}`, since);

  await expect(page).toHaveURL(/\/fr\/account\/setup/);
  await page.getByTestId('setup-name').fill(name);
  await page.locator('#city').fill('Bizerte');
  await page.locator('#new-password').fill(E2E_PASSWORD);
  await page.getByTestId('setup-submit').click();

  // Onboarding starts with what the account already told us.
  await expect(page).toHaveURL(/\/fr\/organizer\/onboarding/);
  await expect(page.getByTestId('org-name')).toHaveValue(name);
  await page.getByTestId('profile-save').click();
  await page.getByTestId('org-category-outdoor').click();
  await page.getByTestId('org-social-instagram').fill('https://instagram.com/club.e2e');
  await page.getByTestId('profile-save').click();
  await expect(page.locator('#org-phone')).toHaveValue(`+216${phone}`);
  await page.getByTestId('org-d17').fill('22 123 456');
  await page.getByTestId('profile-save').click();
  await expect(page).toHaveURL(/\/fr\/organizer$/);

  await page.goto('/fr/organizer/profile');
  await expect(page.getByTestId('organizer-name')).toContainText(name);
  await expect(page.getByText('Bizerte')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
    'href',
    'https://instagram.com/club.e2e',
  );
});

test('a D17 booking shows only the D17 instructions', async ({ page, browser }, info) => {
  test.setTimeout(240_000);

  // The organizer (seeded Sami) gives a D17 number.
  await signInWithPhone(page, 'fr', '22000001');
  await page.goto('/fr/organizer/profile');
  await page.getByTestId('edit-profile').click();
  await page.getByTestId('profile-section-payment').click();
  await page.getByTestId('org-d17').fill('20 000 111');
  await page.getByTestId('profile-save').click();
  // Saving returns to the profile preview.
  await expect(page.getByTestId('edit-profile')).toBeVisible();

  // Sami publishes a fresh hike, so the test never meets a full event.
  const { eventUrl } = await createPublishedHike(page, 'fr', {
    title: `E2E D17 ${Date.now().toString(36)}${info.project.name[0]}`,
  });

  // A guest (no account) books it and chooses D17.
  const { viewport, userAgent, isMobile, hasTouch, deviceScaleFactor } = info.project.use;
  const context = await browser.newContext({
    viewport,
    userAgent,
    isMobile,
    hasTouch,
    deviceScaleFactor,
    acceptDownloads: true,
  });
  const guest = await context.newPage();
  await guest.goto(`${eventUrl}/book`);
  await guest.getByTestId('checkout-next-details').click();
  // "Continue" explains what is missing instead of staying greyed out.
  await guest.getByTestId('checkout-next-payment').click();
  await expect(guest.getByTestId('checkout-missing')).toBeVisible();
  await guest.locator('#name-0').fill('Invité D17');
  await guest.locator('#phone-0').fill('55 123 456');
  await guest.getByTestId('checkout-next-payment').click();
  await guest.getByTestId('pay-method-d17').click();
  // Guests get their PDF ticket automatically (Q23).
  const download = guest.waitForEvent('download');
  await guest.getByTestId('confirm-booking').click();
  await guest.waitForURL(/\/fr\/tickets\/[^/?]+\?booked=1/);
  await expect(guest.getByTestId('booked-banner')).toBeVisible();
  await expect(guest.getByTestId('ticket-status')).toHaveAttribute(
    'data-status',
    'awaiting_payment',
  );
  await expect(guest.getByTestId('pay-to-d17')).toHaveText('20 000 111');
  await expect(guest.getByTestId('upload-proof')).toBeVisible();
  // No second choice of method on the page; only a discreet "Pay differently".
  await expect(guest.locator('[data-testid^="pay-method-"]')).toHaveCount(0);
  await expect(guest.getByTestId('pay-online')).toHaveCount(0);
  await expect(guest.getByTestId('pay-differently')).toBeVisible();

  // The PDF ticket: downloaded once automatically, and on demand.
  expect((await download).suggestedFilename()).toMatch(/^doulisha-DLS-.+\.pdf$/);
  const reference = /tickets\/([^?]+)/.exec(guest.url())![1]!;
  const pdf = await guest.request.get(`/api/tickets/${reference}/pdf?locale=fr`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toBe('application/pdf');
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
  // Nobody else can download it.
  const stranger = await browser.newContext();
  const refused = await stranger.request.get(`http://localhost:3000/api/tickets/${reference}/pdf`);
  expect(refused.status()).toBe(401);
  await stranger.close();
  await context.close();
});
