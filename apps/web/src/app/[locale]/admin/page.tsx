import { getTranslations } from 'next-intl/server';

import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';

import { DataExplorer } from './data-explorer';

/** Back office home: the data explorer (seed data check, Phase 1 acceptance). */
export default async function AdminPage({ params }: PageProps<'/[locale]/admin'>) {
  await resolveLocale(params);
  const t = await getTranslations('Admin');
  const tTemplates = await getTranslations('AdminTemplates');
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="mt-1 text-muted-foreground">{t('dataExplorer')}</p>
      <Link
        href="/admin/templates"
        className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
      >
        {tTemplates('title')}
      </Link>
      <DataExplorer />
    </div>
  );
}
