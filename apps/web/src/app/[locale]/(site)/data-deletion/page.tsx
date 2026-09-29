import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LegalPage } from '@/components/doulisha/legal-page';
import { resolveLocale } from '@/i18n/locale';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/data-deletion'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'Legal' });
  return { title: t('dataDeletion') };
}

/** How to have an account and its data deleted (asked by Meta for Facebook sign-in, ADR 0019). */
export default async function DataDeletionPage({ params }: PageProps<'/[locale]/data-deletion'>) {
  const locale = await resolveLocale(params);
  return <LegalPage kind="dataDeletion" locale={locale} />;
}
