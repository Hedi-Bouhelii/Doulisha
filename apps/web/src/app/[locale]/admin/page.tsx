import { getTranslations } from 'next-intl/server';

import { DataExplorer } from './data-explorer';
import { resolveLocale } from '@/i18n/locale';

/** Back office home: the data explorer (seed data check, Phase 1 acceptance). */
export default async function AdminPage({ params }: PageProps<'/[locale]/admin'>) {
  await resolveLocale(params);
  const t = await getTranslations('Admin');
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="mt-1 text-muted-foreground">{t('dataExplorer')}</p>
      <DataExplorer />
    </div>
  );
}
