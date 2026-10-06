import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/doulisha/page';
import { PaymentsInbox } from '@/components/doulisha/payments-inbox';
import { resolveLocale } from '@/i18n/locale';
import { api } from '@/trpc/server';

/** PRT-03: every D17 and transfer payment to verify or wait for, across the organizer's events. */
export default async function OrganizerPaymentsPage({
  params,
}: PageProps<'/[locale]/organizer/payments'>) {
  await resolveLocale(params);
  const t = await getTranslations('Payments');
  const inbox = await (await api()).organizer.payments({});
  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('intro')} />
      <PaymentsInbox inbox={inbox} showEvent />
    </div>
  );
}
