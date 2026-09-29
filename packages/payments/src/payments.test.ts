import { describe, expect, it } from 'vitest';

import { manualProvider } from './manual';
import { createMockProvider, MOCK_SIGNATURE_HEADER } from './mock';
import { sign, verify } from './signature';
import { InvalidWebhookError } from './types';

const mock = createMockProvider({
  secret: 'test-secret',
  gatewayUrl: (input, ref) => `/fr/checkout/mock-pay?payment=${input.paymentId}&ref=${ref}`,
});

describe('signatures', () => {
  it('accepts the right signature and rejects others', () => {
    const sig = sign('{"a":1}', 's');
    expect(verify('{"a":1}', sig, 's')).toBe(true);
    expect(verify('{"a":2}', sig, 's')).toBe(false);
    expect(verify('{"a":1}', sig, 'other')).toBe(false);
    expect(verify('{"a":1}', null, 's')).toBe(false);
    expect(verify('{"a":1}', 'zz', 's')).toBe(false);
  });
});

describe('mock provider', () => {
  it('redirects to the simulated gateway', async () => {
    const result = await mock.createPayment({
      paymentId: 'p1',
      orderReference: 'DLS-ABC123',
      amountMillimes: 45_000,
      method: 'card',
      returnUrl: '/fr/tickets/DLS-ABC123',
      locale: 'fr',
    });
    expect(result.kind).toBe('redirect');
    if (result.kind === 'redirect') expect(result.url).toContain('payment=p1');
  });

  it('parses signed webhooks and refuses tampered ones', async () => {
    const { body, signature } = mock.buildWebhook({
      paymentId: 'p1',
      providerRef: 'mock_1',
      status: 'succeeded',
      amountMillimes: 45_000,
    });
    const event = await mock.parseWebhook(
      body,
      new Headers({ [MOCK_SIGNATURE_HEADER]: signature }),
    );
    expect(event).toMatchObject({ paymentId: 'p1', status: 'succeeded', amountMillimes: 45_000 });
    expect(event.eventId).toMatch(/^evt_/);

    const tampered = body.replace('45000', '1');
    await expect(
      mock.parseWebhook(tampered, new Headers({ [MOCK_SIGNATURE_HEADER]: signature })),
    ).rejects.toBeInstanceOf(InvalidWebhookError);
  });
});

describe('manual provider', () => {
  it('leaves the payment pending for the organizer', async () => {
    const result = await manualProvider.createPayment({
      paymentId: 'p2',
      orderReference: 'DLS-XYZ789',
      amountMillimes: 20_000,
      method: 'd17',
      returnUrl: '/',
      locale: 'ar',
    });
    expect(result).toEqual({ kind: 'pending_manual' });
  });
});
