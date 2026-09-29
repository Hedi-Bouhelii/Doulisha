import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LegalPage } from '@/components/doulisha/legal-page';
import { resolveLocale } from '@/i18n/locale';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/terms'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'Legal' });
  return { title: t('terms') };
}

export default async function TermsPage({ params }: PageProps<'/[locale]/terms'>) {
  await resolveLocale(params);
  return <LegalPage kind="terms" />;
}
