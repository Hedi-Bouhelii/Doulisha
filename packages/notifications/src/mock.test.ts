import { beforeEach, describe, expect, it } from 'vitest';

import { clearOutbox, mockEmailSender, mockSmsSender, readOutbox } from './mock';

describe('mock senders', () => {
  beforeEach(() => clearOutbox());

  it('keeps the latest messages first', async () => {
    await mockSmsSender.send({ to: '+21620123456', body: 'Code 123456' });
    await mockEmailSender.send({ to: 'a@b.tn', subject: 'Hi', text: 'Link' });
    const [latest, previous] = readOutbox();
    expect(latest).toMatchObject({ channel: 'email', to: 'a@b.tn' });
    expect(previous).toMatchObject({ channel: 'sms', body: 'Code 123456' });
  });

  it('keeps at most 50 messages', async () => {
    for (let i = 0; i < 60; i++) await mockSmsSender.send({ to: '+21620000000', body: `${i}` });
    expect(readOutbox()).toHaveLength(50);
    expect(readOutbox()[0]).toMatchObject({ body: '59' });
  });
});
