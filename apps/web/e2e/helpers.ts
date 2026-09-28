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

/**
 * Creates and publishes a paid hike with one "Standard" ticket at 30 DT, from
 * the organizer space of the signed-in organizer. Returns the event id and the
 * public page URL. Each test gets fresh places, whatever earlier runs booked.
 */
export async function createPublishedHike(
  page: Page,
  locale: string,
  { title, capacity = 20 }: { title: string; capacity?: number },
) {
  await page.goto(`/${locale}/organizer/events/new`);
  await page.getByTestId('template-hiking_trip').click();
  await page.waitForURL(/\/organizer\/events\/[0-9a-f-]+\/edit$/);
  const eventId = /events\/([0-9a-f-]+)\/edit/.exec(page.url())![1]!;

  await page.getByTestId('wizard-title').fill(title);
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('wizard-city').fill('Zaghouan');
  await page.getByTestId('wizard-next').click();
  await page.locator('#detail-difficulty').fill('2');
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('wizard-registration-paid').click();
  await page.getByTestId('wizard-capacity').fill(String(capacity));
  await page.getByTestId('add-ticket-type').click();
  await page.getByTestId('ticket-name-0').fill('Standard');
  await page.getByTestId('ticket-price-0').fill('30');

  await page.getByTestId('wizard-step-publish').click();
  await expect(page.getByTestId('publish-event')).toBeVisible();
  await expect(page.getByTestId('publish-problems')).toHaveCount(0);
  await page.getByTestId('publish-event').click();
  await expect(page.getByTestId('wizard-published')).toBeVisible();
  await page.getByTestId('view-published').click();
  await page.waitForURL(new RegExp(`/${locale}/events/[^/]+$`));
  return { eventId, eventUrl: page.url() };
}
