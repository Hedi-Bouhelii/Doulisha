import { getTranslations } from 'next-intl/server';

import { BackLink, PageHeader } from '@/components/doulisha/page';
import { resolveLocale } from '@/i18n/locale';
import { api } from '@/trpc/server';

import { TemplatePicker } from './template-picker';

/** EVT-01 step zero: pick what you are organizing; the wizard adapts to the template. */
export default async function NewEventPage({
  params,
}: PageProps<'/[locale]/organizer/events/new'>) {
  await resolveLocale(params);
  const t = await getTranslations('Wizard');
  const tOrganizer = await getTranslations('Organizer');
  const caller = await api();
  const [templates, profiles] = await Promise.all([
    caller.editor.templates(),
    caller.organizer.profiles(),
  ]);

  return (
    <div>
      <BackLink href="/organizer">{tOrganizer('dashboard')}</BackLink>
      <PageHeader title={t('newTitle')} description={t('newHint')} />
      <TemplatePicker
        // Private gatherings have their own quick form (/host, INV-01).
        templates={templates
          .filter((tpl) => tpl.model !== 'private')
          .map((tpl) => ({ key: tpl.key, name: tpl.name, category: tpl.category }))}
        profiles={profiles.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
