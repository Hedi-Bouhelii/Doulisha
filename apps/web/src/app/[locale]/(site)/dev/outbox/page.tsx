import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { OutboxList } from './outbox-list';
import { resolveLocale } from '@/i18n/locale';

export const metadata: Metadata = { robots: { index: false } };

/** Development only: fake SMS and emails (OTP codes, magic links). */
export default async function DevOutboxPage({ params }: PageProps<'/[locale]/dev/outbox'>) {
  if (process.env.NODE_ENV === 'production') notFound();
  await resolveLocale(params);
  const t = await getTranslations('Dev');
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t('outboxTitle')}</h1>
      <p className="mt-2 text-muted-foreground">{t('outboxHint')}</p>
      <OutboxList />
    </div>
  );
}
