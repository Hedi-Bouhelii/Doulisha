import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/doulisha/page';
import { resolveLocale } from '@/i18n/locale';

import { OutboxList } from './outbox-list';

export const metadata: Metadata = { robots: { index: false } };

/** Development only: fake SMS and emails (OTP codes, magic links). */
export default async function DevOutboxPage({ params }: PageProps<'/[locale]/dev/outbox'>) {
  if (process.env.NODE_ENV === 'production') notFound();
  await resolveLocale(params);
  const t = await getTranslations('Dev');
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader title={t('outboxTitle')} description={t('outboxHint')} />
      <OutboxList />
    </div>
  );
}
