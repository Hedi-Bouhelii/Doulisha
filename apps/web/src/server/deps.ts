import 'server-only';

import { createHmac } from 'node:crypto';

import type { BuyerNotice, ServiceDeps } from '@doulisha/api';
import { formatPrice } from '@doulisha/i18n';
import { mockEmailSender, mockSmsSender } from '@doulisha/notifications';
import { getTranslations } from 'next-intl/server';
import { withTransaction } from '@doulisha/db';
import { createMockProvider, manualProvider } from '@doulisha/payments';
import { createLocalProvider } from '@doulisha/storage';

import { getServerEnv } from '@/env';

/**
 * Secrets for the mock gateway and local uploads, derived from the auth secret
 * so local setup needs no extra variables. Real providers get their own keys.
 */
export function derivedSecret(purpose: 'mock-payments' | 'uploads') {
  return createHmac('sha256', getServerEnv().BETTER_AUTH_SECRET).update(purpose).digest('hex');
}

let deps: ServiceDeps | undefined;

/** Infrastructure injected into the API services (see packages/api/src/deps.ts). */
export function getServiceDeps(): ServiceDeps {
  if (deps) return deps;
  const env = getServerEnv();
  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  deps = {
    transaction: (fn) => withTransaction(env.DATABASE_URL, fn),
    payments: {
      mock: createMockProvider({
        secret: derivedSecret('mock-payments'),
        gatewayUrl: (input, providerRef) =>
          `${appUrl}/${input.locale}/checkout/mock-pay?payment=${input.paymentId}&ref=${encodeURIComponent(providerRef)}&amount=${input.amountMillimes}&order=${input.orderReference}`,
      }),
      manual: manualProvider,
    },
    storage: createLocalProvider({ secret: derivedSecret('uploads') }),
    appUrl,
    notify: (notice) => sendBuyerNotice(notice, appUrl),
  };
  return deps;
}

/**
 * Buyer messages (ADR 0018) in the language of the booking: SMS when the buyer
 * gave a phone, email otherwise. Mock senders until Phase 6 (dev outbox).
 */
async function sendBuyerNotice(notice: BuyerNotice, appUrl: string) {
  const t = await getTranslations({ locale: notice.locale, namespace: 'Notify' });
  const tReasons = await getTranslations({ locale: notice.locale, namespace: 'Payments.reasons' });
  const values = {
    reference: notice.reference,
    event: notice.eventTitle,
    amount: formatPrice(notice.amountMillimes ?? 0, notice.locale),
    reason: notice.reason ? tReasons(notice.reason as 'other') : '',
    note: notice.note ?? '',
    url: `${appUrl}/${notice.locale}/tickets/${notice.reference}`,
  };
  const text = t(notice.kind, values);
  if (notice.to.phone) {
    await mockSmsSender.send({ to: notice.to.phone, body: text });
  } else if (notice.to.email) {
    await mockEmailSender.send({
      to: notice.to.email,
      subject: t(`${notice.kind}Subject`, values),
      text,
    });
  }
}

/** The mock provider with its webhook builder (for the simulated gateway page). */
export function getMockPayments() {
  return createMockProvider({ secret: derivedSecret('mock-payments'), gatewayUrl: () => '' });
}
