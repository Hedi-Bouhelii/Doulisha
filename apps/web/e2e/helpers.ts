import { expect, type Page } from '@playwright/test';

interface OutboxMessage {
  channel: 'sms' | 'email';
  to: string;
  sentAt: string;
  body?: string;
  text?: string;
}

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

/** Signs in with phone OTP on the sign-in page of the given locale. */
export async function signInWithPhone(page: Page, locale: string, localPhone: string) {
  const e164 = `+216${localPhone.replace(/\s/g, '')}`;
  await page.goto(`/${locale}/sign-in`);
  await page.locator('#phone').fill(localPhone);
  const since = Date.now() - 1000;
  await page
    .locator('form')
    .filter({ has: page.locator('#phone') })
    .locator('button[type=submit]')
    .click();
  await expect(page.locator('#otp')).toBeVisible();
  const code = await readOutbox(page, { channel: 'sms', to: e164, since, pattern: /\d{6}/ });
  await page.locator('#otp').fill(code);
  await page
    .locator('form')
    .filter({ has: page.locator('#otp') })
    .locator('button[type=submit]')
    .click();
}
