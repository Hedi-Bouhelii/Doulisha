import { type Browser, expect, type Page, test, type TestInfo } from '@playwright/test';

import { createPublishedHike, readOutbox, signInWithPhone } from './helpers';

/**
 * Manual payments (ADR 0018): a D17 booking is a reservation without a QR code
 * until the organizer confirms the money; receipts are reviewed in the
 * payments inbox, where a refusal carries a reason the buyer sees. Cash at the
 * door is collected at check-in.
 */

test.describe.configure({ mode: 'serial' });

// A 1×1 PNG, enough to stand for a D17 screenshot.
const receipt = {
  name: 'recu-d17.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  ),
};

async function guestPage(browser: Browser, info: TestInfo) {
  const { viewport, userAgent, isMobile, hasTouch, deviceScaleFactor } = info.project.use;
  const context = await browser.newContext({
    viewport,
    userAgent,
    isMobile,
    hasTouch,
    deviceScaleFactor,
    acceptDownloads: true,
  });
  return { context, guest: await context.newPage() };
}

async function bookAsGuest(guest: Page, eventUrl: string, name: string, method: 'd17' | 'cash') {
  await guest.goto(`${eventUrl}/book`);
  await guest.getByTestId('checkout-next-details').click();
  await guest.locator('#name-0').fill(name);
  await guest.locator('#phone-0').fill('55 123 456');
  await guest.getByTestId('checkout-next-payment').click();
  await guest.getByTestId(`pay-method-${method}`).click();
  await guest.getByTestId('confirm-booking').click();
  await guest.waitForURL(/\/fr\/tickets\/[^/?]+\?booked=1/);
  return /tickets\/([^?]+)/.exec(guest.url())![1]!;
}

test('D17: reserved without a QR code, receipt refused with a reason, then confirmed', async ({
  page,
  browser,
}, info) => {
  test.setTimeout(300_000);
  const suffix = `${Date.now().toString(36)}${info.project.name[0]}`;
  const guestName = `Invité D17 ${suffix}`;

  // The organizer (seeded Sami) gives a D17 number and publishes a fresh hike.
  await signInWithPhone(page, 'fr', '22000001');
  await page.goto('/fr/organizer/profile');
  await page.getByTestId('edit-profile').click();
  await page.getByTestId('profile-section-payment').click();
  await page.getByTestId('org-d17').fill('20 000 111');
  await page.getByTestId('profile-save').click();
  await expect(page.getByTestId('edit-profile')).toBeVisible();
  const { eventId, eventUrl } = await createPublishedHike(page, 'fr', {
    title: `E2E D17 ${suffix}`,
  });
  // The template details show on the public page.
  await expect(page.getByTestId('event-facts')).toContainText('2 / 5');

  // A guest (no account) books with D17: a reservation, no QR code, no PDF yet.
  const { context, guest } = await guestPage(browser, info);
  const reference = await bookAsGuest(guest, eventUrl, guestName, 'd17');
  await expect(guest.getByTestId('booked-banner')).toBeVisible();
  await expect(guest.getByTestId('ticket-status')).toHaveAttribute('data-status', 'reserved');
  await expect(guest.getByTestId('pay-to-d17')).toHaveText('20 000 111');
  await expect(guest.getByTestId('write-reference')).toContainText(reference);
  await expect(guest.getByTestId('payment-deadline')).toBeVisible();
  await expect(guest.getByTestId('qr-pending')).toBeVisible();
  await expect(guest.getByTestId('ticket-qr')).toHaveCount(0);
  await expect(guest.getByTestId('download-pdf')).toHaveCount(0);
  // No second choice of method on the page; only a discreet "Pay differently".
  await expect(guest.locator('[data-testid^="pay-method-"]')).toHaveCount(0);
  await expect(guest.getByTestId('pay-online')).toHaveCount(0);
  await expect(guest.getByTestId('pay-differently')).toBeVisible();
  expect((await guest.request.get(`/api/tickets/${reference}/pdf?locale=fr`)).status()).toBe(409);

  // The guest sends a receipt.
  await guest.locator('input[type="file"]').setInputFiles(receipt);
  await expect(guest.getByTestId('proof-pending')).toBeVisible();

  // Sami is told there is a receipt to verify.
  await page.goto('/fr/organizer');
  await expect(page.getByTestId('receipts-banner')).toBeVisible();
  await expect(page.getByTestId('payments-badge')).toBeVisible();

  // While the receipt waits, the attendee list offers no "mark as paid" around it.
  await page.goto(`/fr/organizer/events/${eventId}`);
  const row = page.getByTestId('attendee-row').filter({ hasText: guestName });
  await expect(row.getByTestId('verify-receipt')).toBeVisible();
  await expect(row.getByTestId('mark-paid')).toHaveCount(0);

  // Sami refuses the receipt from the payments inbox, with a reason.
  await page.goto('/fr/organizer/payments');
  let item = page.locator(`[data-testid="payment-item"][data-reference="${reference}"]`);
  await expect(item.getByTestId('receipt-preview')).toBeVisible();
  await expect(item.getByTestId('expected-amount')).toContainText('30');
  let since = Date.now() - 1000;
  await item.getByTestId('reject-proof').click();
  await page.getByTestId('reason-unreadable').click();
  await page.getByTestId('reject-note').fill('Merci d’envoyer une capture nette.');
  await page.getByTestId('confirm-reject').click();
  await expect(item.getByTestId('receipt-preview')).toHaveCount(0);
  await readOutbox(page, { channel: 'sms', to: '+21655123456', since, pattern: /refusé/ });

  // The guest sees why, and sends a new receipt.
  await guest.reload();
  await expect(guest.getByTestId('proof-rejected')).toContainText('illisible');
  await expect(guest.getByTestId('proof-rejected')).toContainText('capture nette');
  await expect(guest.getByTestId('payment-deadline')).toBeVisible();
  await guest.locator('input[type="file"]').setInputFiles(receipt);
  await expect(guest.getByTestId('proof-pending')).toBeVisible();

  // Sami confirms it, with the D17 transaction number.
  await page.reload();
  item = page.locator(`[data-testid="payment-item"][data-reference="${reference}"]`);
  await expect(item.getByTestId('receipt-preview')).toBeVisible();
  since = Date.now() - 1000;
  await item.getByLabel('Numéro de transaction (facultatif)').fill('D17-445566');
  await item.getByTestId('approve-proof').click();
  await expect(item).toHaveCount(0);
  await page.getByTestId('payments-tab-confirmed').click();
  await expect(
    page.locator(`[data-testid="confirmed-payment"][data-reference="${reference}"]`),
  ).toContainText('D17-445566');
  await readOutbox(page, { channel: 'sms', to: '+21655123456', since, pattern: /paiement reçu/ });

  // The guest's ticket is confirmed: QR code, and the PDF downloads by itself (Q23).
  const download = guest.waitForEvent('download');
  await guest.reload();
  await expect(guest.getByTestId('ticket-status')).toHaveAttribute('data-status', 'confirmed');
  await expect(guest.getByTestId('ticket-qr')).toBeVisible();
  expect((await download).suggestedFilename()).toMatch(/^doulisha-DLS-.+\.pdf$/);
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

test('cash at the door: the scanner asks to collect before checking in', async ({
  page,
  browser,
}, info) => {
  test.setTimeout(240_000);
  const suffix = `${Date.now().toString(36)}${info.project.name[0]}`;
  const guestName = `Invité espèces ${suffix}`;

  await signInWithPhone(page, 'fr', '22000001');
  const { eventId, eventUrl } = await createPublishedHike(page, 'fr', {
    title: `E2E Espèces ${suffix}`,
    registration: 'pay_at_door',
  });

  // Cash keeps the QR code: the place is confirmed, the money comes at the door.
  const { context, guest } = await guestPage(browser, info);
  await bookAsGuest(guest, eventUrl, guestName, 'cash');
  const qr = guest.getByTestId('ticket-qr');
  await expect(qr).toBeVisible();
  const ticketCode = (await qr.locator('figcaption').innerText()).trim();
  await context.close();

  await page.goto(`/fr/organizer/events/${eventId}/check-in`);
  await page.getByTestId('checkin-code').fill(ticketCode);
  await page.getByTestId('checkin-submit').click();
  const result = page.getByTestId('checkin-result');
  await expect(result).toHaveAttribute('data-tone', 'collect');
  await expect(result).toContainText(guestName);
  await expect(result).toContainText('30');
  await page.getByTestId('collect-and-check-in').click();
  await expect(result).toHaveAttribute('data-tone', 'ok');

  // Paid and present in the attendee list.
  await page.goto(`/fr/organizer/events/${eventId}`);
  await expect(page.getByTestId('present-count')).toContainText('1');
});
