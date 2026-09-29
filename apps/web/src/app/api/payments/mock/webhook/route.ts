import { handlePaymentEvent } from '@doulisha/api';
import { InvalidWebhookError } from '@doulisha/payments';

import { getMockPayments, getServiceDeps } from '@/server/deps';

/**
 * Webhook of the simulated gateway (PAY-02). The signature is verified before
 * the body is trusted, and processing is idempotent, so replays are harmless.
 */
export async function POST(request: Request) {
  const body = await request.text();
  try {
    const event = await getMockPayments().parseWebhook(body, request.headers);
    const result = await handlePaymentEvent(getServiceDeps(), event);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof InvalidWebhookError) {
      return Response.json({ ok: false }, { status: 401 });
    }
    console.error('Mock payment webhook failed', error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
