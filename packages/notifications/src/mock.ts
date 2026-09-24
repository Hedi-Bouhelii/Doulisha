import type { EmailMessage, EmailSender, OutboxEntry, SmsMessage, SmsSender } from './types';

const MAX_ENTRIES = 50;

// Stored on globalThis so every route bundle in the same dev server process
// shares one outbox.
const store = globalThis as typeof globalThis & { __doulishaOutbox?: OutboxEntry[] };

function outbox(): OutboxEntry[] {
  store.__doulishaOutbox ??= [];
  return store.__doulishaOutbox;
}

function push(entry: OutboxEntry) {
  const list = outbox();
  list.unshift(entry);
  list.length = Math.min(list.length, MAX_ENTRIES);
}

/**
 * Development SMS sender: nothing leaves the machine. Messages are logged and
 * kept in memory so the dev outbox page and E2E tests can read the OTP.
 */
export const mockSmsSender: SmsSender = {
  send(message: SmsMessage) {
    push({ channel: 'sms', sentAt: new Date().toISOString(), ...message });
    console.warn(`[mock sms] to ${message.to}: ${message.body}`);
    return Promise.resolve();
  },
};

export const mockEmailSender: EmailSender = {
  send(message: EmailMessage) {
    push({ channel: 'email', sentAt: new Date().toISOString(), ...message });
    console.warn(`[mock email] to ${message.to}: ${message.subject}\n${message.text}`);
    return Promise.resolve();
  },
};

/** Latest messages first. Only exposed by the web app outside production. */
export function readOutbox(): readonly OutboxEntry[] {
  return outbox();
}

export function clearOutbox(): void {
  outbox().length = 0;
}
