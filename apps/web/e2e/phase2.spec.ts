import { expect, test } from '@playwright/test';

import { signInWithPhone } from './helpers';

/**
 * Phase 2 acceptance (BUILD_PROMPT section 8), in the three languages:
 * an organizer creates a hike and publishes it, shares it, a guest books with
 * the mock payment, the organizer sees the payment and checks the guest in,
 * and the guest's ticket shows its QR code.
 */

test.describe.configure({ mode: 'serial' });

/** Sami owns the seeded "Kroumirie Trekkers" organizer profile. */
const ORGANIZER_PHONE = '22000001';

for (const locale of ['fr', 'ar', 'en'] as const) {
  test(`hike: create, publish, share, book with mock payment, check in (${locale})`, async ({
    page,
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const stamp = `${Date.now().toString(36)}${testInfo.project.name[0]}`;
    const title = `E2E rando ${locale} ${stamp}`;
    const guestName = `Invité ${stamp}`;

    // --- The organizer creates the hike from its template -----------------------
    await signInWithPhone(page, locale, ORGANIZER_PHONE);
    await expect(page.getByTestId('user-menu')).toBeVisible();
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
    await page.getByTestId('wizard-capacity').fill('20');
    await page.getByTestId('add-ticket-type').click();
    await page.getByTestId('ticket-name-0').fill('Standard');
    await page.getByTestId('ticket-price-0').fill('30');

    // --- Publish: nothing is missing -------------------------------------------
    await page.getByTestId('wizard-step-publish').click();
    await expect(page.getByTestId('publish-event')).toBeVisible();
    await expect(page.getByTestId('publish-problems')).toHaveCount(0);
    await page.getByTestId('publish-event').click();
    await expect(page.getByTestId('wizard-published')).toBeVisible();
    await page.getByTestId('view-published').click();
    await page.waitForURL(new RegExp(`/${locale}/events/[^/]+$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    const eventUrl = page.url();
    const slug = eventUrl.split('/').pop()!;

    // --- Share: tracked links and a generated image ----------------------------
    await expect(page.getByTestId('share-whatsapp')).toHaveAttribute(
      'href',
      /utm_source%3Dwhatsapp/,
    );
    const image = await page.request.get(`/api/og/event?slug=${slug}&format=og&locale=${locale}`);
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toBe('image/jpeg');

    // --- A guest (no account) books from the WhatsApp link and pays -------------
    const { viewport, userAgent, isMobile, hasTouch, deviceScaleFactor } = testInfo.project.use;
    const guestContext = await browser.newContext({
      viewport,
      userAgent,
      isMobile,
      hasTouch,
      deviceScaleFactor,
    });
    const guest = await guestContext.newPage();
    await guest.goto(`${eventUrl}?utm_source=whatsapp&utm_medium=share`);
    await guest.getByTestId('book-cta').click();
    // A single ticket type is preselected with one place.
    await expect(guest.getByTestId('add-ticket-Standard')).toBeVisible();
    await guest.getByTestId('checkout-next-details').click();
    await guest.locator('#name-0').fill(guestName);
    await guest.locator('#phone-0').fill('55123456');
    await guest.getByTestId('checkout-next-payment').click();
    await guest.locator('input[name=payment][value=online]').check();
    await guest.getByTestId('confirm-booking').click();
    await guest.getByTestId('mock-pay').click();
    await guest.waitForURL(new RegExp(`/${locale}/tickets/`));
    await expect(guest.getByTestId('ticket-status')).toHaveAttribute('data-status', 'confirmed');
    const qr = guest.getByTestId('ticket-qr');
    await expect(qr.locator('svg')).toBeVisible();
    const ticketCode = (await qr.locator('figcaption').innerText()).trim();
    expect(ticketCode).toMatch(/^[A-Z0-9]{6,}$/);

    // --- The organizer sees the paid booking and its source, then checks in ------
    await page.goto(`/${locale}/organizer/events/${eventId}`);
    const row = page.getByTestId('attendee-row').filter({ hasText: guestName });
    await expect(row.getByTestId('attendee-payment')).toHaveAttribute('data-payment', 'paid');
    await expect(row).toContainText('whatsapp');

    await page.getByTestId('open-check-in').click();
    await page.getByTestId('checkin-code').fill(ticketCode);
    await page.getByTestId('checkin-submit').click();
    await expect(page.getByTestId('checkin-result')).toHaveAttribute('data-tone', 'ok');
    await expect(page.getByTestId('checkin-result')).toContainText(guestName);

    // The same ticket cannot be used twice.
    await page.getByTestId('checkin-code').fill(ticketCode);
    await page.getByTestId('checkin-submit').click();
    await expect(page.getByTestId('checkin-result')).toHaveAttribute('data-tone', 'warn');

    // --- The guest's ticket now shows the check-in ------------------------------
    await guest.reload();
    await expect(guest.getByTestId('ticket-qr')).toBeVisible();
    await guestContext.close();
  });
}

test('private invitation: a guest answers without an account (ar)', async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const stamp = `${Date.now().toString(36)}${testInfo.project.name[0]}`;
  const title = `عيد ميلاد ${stamp}`;
  const guestName = `ضيف ${stamp}`;

  await signInWithPhone(page, 'ar', ORGANIZER_PHONE);
  await expect(page.getByTestId('user-menu')).toBeVisible();
  await page.goto('/ar/host/new');
  await page.getByTestId('host-title').fill(title);
  await page.getByTestId('host-create').click();
  await expect(page.getByTestId('invite-ready')).toBeVisible();
  const inviteUrl = (await page.getByTestId('invite-url').innerText()).trim();

  const { viewport, userAgent, isMobile, hasTouch, deviceScaleFactor } = testInfo.project.use;
  const guestContext = await browser.newContext({
    viewport,
    userAgent,
    isMobile,
    hasTouch,
    deviceScaleFactor,
  });
  const guest = await guestContext.newPage();
  await guest.goto(inviteUrl);
  await expect(guest.getByTestId('invite-title')).toHaveText(title);
  await expect(guest.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  // The guest list stays hidden until the guest answers (TRS-06).
  await expect(guest.getByTestId('guest-list')).toHaveCount(0);

  await guest.getByTestId('rsvp-going').click();
  await guest.getByTestId('rsvp-name').fill(guestName);
  await guest.getByTestId('rsvp-send').click();
  await expect(guest.getByTestId('rsvp-done')).toBeVisible();
  await expect(guest.getByTestId('guest-list')).toContainText(guestName);

  // The host sees the answer too.
  await page.goto(inviteUrl);
  await expect(page.getByTestId('guest-list')).toContainText(guestName);
  await guestContext.close();
});
