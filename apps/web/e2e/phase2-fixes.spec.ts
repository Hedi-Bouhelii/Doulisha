import { expect, test } from '@playwright/test';

import { E2E_PASSWORD, enterCode } from './helpers';

/**
 * Founder review of Phase 2: sign-up with a password and an account type,
 * organizer onboarding prefilled from the account. D17 bookings are covered
 * by payments.spec.ts.
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
