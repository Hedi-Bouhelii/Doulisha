import { ArrowRight, LayoutTemplate } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/doulisha/page';
import { Button } from '@/components/ui/button';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';

import { DataExplorer } from './data-explorer';

/** Back office home: the data explorer (seed data check, Phase 1 acceptance). */
export default async function AdminPage({ params }: PageProps<'/[locale]/admin'>) {
  await resolveLocale(params);
  const t = await getTranslations('Admin');
  const tTemplates = await getTranslations('AdminTemplates');
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        title={t('title')}
        description={t('dataExplorer')}
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/templates">
              <LayoutTemplate aria-hidden="true" />
              {tTemplates('title')}
              <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      <DataExplorer />
    </div>
  );
}
