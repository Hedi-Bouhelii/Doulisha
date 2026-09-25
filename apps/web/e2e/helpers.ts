import { expect, type Page } from '@playwright/test';

interface OutboxMessage {
  channel: 'sms' | 'email';
  to: string;
  sentAt: string;
  body?: string;
  text?: string;
}

/** Password given to seeded accounts the first time E2E signs them in (ADR 0016). */
export const E2E_PASSWORD = 'doulisha-e2e-2026';

/**
 * Waits for a message from the mock SMS or email sender (development only),
 * ignoring anything sent before `since` so earlier runs cannot interfere.
 */
export async function readOutbox(
  page: Page,
  {
    channel,
    to,
    since,
    pattern,
  }: { channel: 'sms' | 'email'; to: string; since: number; pattern: RegExp },
): Promise<string> {
  let match: string | undefined;
  await expect
    .poll(async () => {
      const response = await page.request.get('/api/dev/outbox');
      const { messages } = (await response.json()) as { messages: OutboxMessage[] };
      const message = messages.find(
        (m) => m.channel === channel && m.to === to && Date.parse(m.sentAt) >= since,
      );
      match = (message?.body ?? message?.text)?.match(pattern)?.[0];
      return match;
    })
    .toBeTruthy();
  return match!;
}

/** Enters the 6-digit code that the mock sender delivered. */
export async function enterCode(page: Page, channel: 'sms' | 'email', to: string, since: number) {
  await expect(page.locator('#otp')).toBeVisible();
  const code = await readOutbox(page, { channel, to, since, pattern: /\d{6}/ });
  await page.locator('#otp').fill(code);
  await page.getByTestId('verify-code').click();
}

/**
 * Finishes account setup when it appears (new accounts, and seeded accounts
 * signing in for the first time): keeps or sets the name, sets the password.
 */
export async function completeSetupIfAsked(page: Page, name?: string) {
  // The sign-in form goes to /account/setup only when the account needs it.
  await page.waitForURL(
    (url) => !url.pathname.endsWith('/sign-in') && !url.pathname.endsWith('/sign-up'),
  );
  if (!/\/account\/setup/.test(page.url())) return;
  const nameField = page.getByTestId('setup-name');
  await nameField.waitFor();
  if (name || !(await nameField.inputValue())) await nameField.fill(name ?? 'Membre E2E');
  const password = page.locator('#new-password');
  if (await password.count()) await password.fill(E2E_PASSWORD);
  await page.getByTestId('setup-submit').click();
  await page.waitForURL((url) => !/\/account\/setup/.test(url.pathname));
}

/** Signs in with a phone code ("Receive a code instead") on the given locale. */
export async function signInWithPhone(page: Page, locale: string, localPhone: string) {
  const e164 = `+216${localPhone.replace(/\s/g, '')}`;
  await page.goto(`/${locale}/sign-in`);
  await page.getByTestId('use-code').click();
  await page.locator('#phone').fill(localPhone);
  const since = Date.now() - 1000;
  await page.getByTestId('send-code').click();
  await enterCode(page, 'sms', e164, since);
  await completeSetupIfAsked(page);
}
