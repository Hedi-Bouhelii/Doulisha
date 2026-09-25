import { formatPrice } from '@doulisha/i18n';
import { MOCK_SIGNATURE_HEADER } from '@doulisha/payments';
import { CreditCard } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { getServerEnv } from '@/env';
import { resolveLocale } from '@/i18n/locale';
import { redirect } from '@/i18n/navigation';
import { getMockPayments } from '@/server/deps';

export const metadata: Metadata = { robots: { index: false } };

function one(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

/**
 * The simulated payment gateway (development only). "Pay" and "Fail" send a
 * signed webhook to /api/payments/mock/webhook exactly like Konnect or Flouci
 * would, so the real verification and processing path is exercised.
 */
export default async function MockPayPage({
  params,
  searchParams,
}: PageProps<'/[locale]/checkout/mock-pay'>) {
  if (process.env.NODE_ENV === 'production') notFound();
  const locale = await resolveLocale(params);
  const sp = await searchParams;
  const paymentId = one(sp.payment);
  const providerRef = one(sp.ref);
  const amountMillimes = Number(one(sp.amount));
  const reference = one(sp.order);
  if (!paymentId || !providerRef || !Number.isInteger(amountMillimes) || !/^DLS-/.test(reference)) {
    notFound();
  }
  const t = await getTranslations('MockPay');

  async function settle(status: 'succeeded' | 'failed') {
    'use server';
    const { body, signature } = getMockPayments().buildWebhook({
      paymentId,
      providerRef,
      status,
      amountMillimes,
    });
    const appUrl = getServerEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
    const response = await fetch(`${appUrl}/api/payments/mock/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [MOCK_SIGNATURE_HEADER]: signature },
      body,
    });
    if (!response.ok) throw new Error(`Webhook failed (${response.status})`);
    redirect({ href: `/tickets/${reference}`, locale });
  }

  async function pay() {
    'use server';
    await settle('succeeded');
  }

  async function fail() {
    'use server';
    await settle('failed');
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border-2 border-dashed border-highlight/60 bg-card p-6 text-center shadow-sm">
        <CreditCard className="mx-auto size-10 text-highlight" aria-hidden="true" />
        <h1 className="mt-3 font-sans text-xl font-bold">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('hint')}</p>
        <p className="mt-4 text-sm">{t('order', { reference })}</p>
        <p className="mt-1 text-3xl font-bold">{formatPrice(amountMillimes, locale)}</p>
        <form action={pay} className="mt-6">
          <Button type="submit" className="h-12 w-full rounded-full" data-testid="mock-pay">
            {t('pay', { amount: formatPrice(amountMillimes, locale) })}
          </Button>
        </form>
        <form action={fail} className="mt-2">
          <Button type="submit" variant="ghost" className="min-h-11 w-full">
            {t('fail')}
          </Button>
        </form>
      </div>
    </div>
  );
}
