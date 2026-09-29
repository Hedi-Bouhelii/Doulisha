import { type Browser, expect, type Page, test, type TestInfo } from '@playwright/test';

import { signInWithPhone } from './helpers';

/**
 * Phase 4a (ADR 0021): a participant asks the organizer from the event page
 * and gets an answer; a private event's host and guests share a group chat;
 * following an organizer fills the feed.
 */

test.describe.configure({ mode: 'serial' });

const EVENT = '/fr/events/randonnee-foret-ain-draham';
const ORGANIZER = '/fr/organizers/kroumirie-trekkers';
const SAMI = '22000001';
const YASMINE = '50000001';

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

test('visitors are asked to sign in before writing to the organizer', async ({ page }) => {
  await page.goto(EVENT);
  await page.getByRole('tab', { name: 'Organisateur' }).click();
  const ask = page.getByTestId('ask-organizer').first();
  await expect(ask).toHaveAttribute('href', /\/fr\/sign-in\?next=%2Fevents%2Frandonnee/);
});

test('a participant asks the organizer and gets an answer', async ({ page, browser }, info) => {
  test.setTimeout(240_000);
  const question = `Parking près du départ ? ${Date.now().toString(36)}${info.project.name[0]}`;
  const answer = `Oui, devant la maison forestière ${Date.now().toString(36)}`;

  await signInWithPhone(page, 'fr', YASMINE);
  await page.goto(EVENT);
  await page.getByRole('tab', { name: 'Organisateur' }).click();
  await page.getByTestId('ask-organizer').first().click();
  await page.waitForURL(/\/fr\/messages\/[0-9a-f-]+$/);
  await expect(page.getByTestId('chat-title')).toContainText('Kroumirie');
  await page.getByTestId('chat-input').fill(question);
  await page.getByTestId('chat-send').click();
  await expect(page.locator('[data-testid="chat-message"][data-mine="true"]').last()).toContainText(
    question,
  );

  // The organizer sees it as unread in "Messages" and answers.
  const sami = await newPage(browser, info);
  await signInWithPhone(sami, 'fr', SAMI);
  await expect(sami.getByTestId('unread-dot')).toBeVisible();
  await sami.goto('/fr/messages');
  const item = sami.getByTestId('inbox-item').filter({ hasText: question });
  await expect(item.getByTestId('inbox-unread')).toBeVisible();
  await item.click();
  await expect(sami.getByTestId('chat-messages')).toContainText(question);
  await sami.getByTestId('chat-input').fill(answer);
  await sami.keyboard.press('Enter');
  await expect(sami.locator('[data-testid="chat-message"][data-mine="true"]').last()).toContainText(
    answer,
  );

  // The participant's open conversation picks the answer up by itself.
  const reply = page.locator('[data-testid="chat-message"][data-mine="false"]').last();
  await expect(reply).toContainText(answer, { timeout: 20_000 });
  await expect(reply).toContainText('Organisateur');
  await sami.context().close();
});

test('the host and guests of a private event share a group chat', async ({
  page,
  browser,
}, info) => {
  test.setTimeout(240_000);
  const stamp = `${Date.now().toString(36)}${info.project.name[0]}`;
  await signInWithPhone(page, 'fr', SAMI);
  await page.goto('/fr/host/new');
  await page.getByTestId('host-title').fill(`Anniversaire ${stamp}`);
  await page.getByTestId('host-create').click();
  await expect(page.getByTestId('invite-ready')).toBeVisible();
  const inviteUrl = (await page.getByTestId('invite-url').innerText()).trim();

  // A guest without an account answers "going", then writes in the group chat.
  const guest = await newPage(browser, info);
  await guest.goto(inviteUrl);
  await expect(guest.getByTestId('open-group-chat')).toHaveCount(0);
  await guest.getByTestId('rsvp-going').click();
  await guest.getByTestId('rsvp-name').fill(`Invitée ${stamp}`);
  await guest.getByTestId('rsvp-send').click();
  await expect(guest.getByTestId('rsvp-done')).toBeVisible();
  await guest.getByTestId('open-group-chat').click();
  await guest.waitForURL(/\/fr\/messages\/[0-9a-f-]+$/);
  await guest.getByTestId('chat-input').fill(`J’apporte le gâteau ${stamp}`);
  await guest.getByTestId('chat-send').click();
  await expect(guest.getByTestId('chat-messages')).toContainText(`gâteau ${stamp}`);

  // The host opens the same chat from their invitations and sees the guest's name.
  await page.goto(inviteUrl);
  await page.getByTestId('open-group-chat').click();
  await page.waitForURL(/\/fr\/messages\/[0-9a-f-]+$/);
  const message = page.locator('[data-testid="chat-message"]').filter({ hasText: stamp });
  await expect(message).toContainText(`Invitée ${stamp}`);
  await guest.context().close();
});

test('following an organizer shows their events in the feed', async ({ page }) => {
  test.setTimeout(180_000);
  await signInWithPhone(page, 'fr', YASMINE);
  await page.goto(ORGANIZER);
  // Start from "not following", whatever earlier runs left.
  if (await page.getByTestId('unfollow').count()) {
    await page.getByTestId('unfollow').click();
    await expect(page.getByTestId('follow')).toBeVisible();
  }
  await page.getByTestId('follow').click();
  await expect(page.getByTestId('unfollow')).toBeVisible();
  await expect(page.getByTestId('follower-count')).not.toHaveText(/Aucun/);

  await page.getByTestId('user-menu').click();
  await page.getByRole('menuitem', { name: 'Mon fil' }).click();
  await expect(page).toHaveURL(/\/fr\/feed$/);
  await expect(page.getByTestId('feed-following')).toContainText('Kroumirie');
  await expect(page.getByTestId('feed-events')).toBeVisible();

  await page.goto(ORGANIZER);
  await page.getByTestId('unfollow').click();
  await expect(page.getByTestId('follow')).toBeVisible();
});
