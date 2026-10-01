import { getTranslations } from 'next-intl/server';

import { BackLink, PageHeader } from '@/components/doulisha/page';
import { resolveLocale } from '@/i18n/locale';
import { api } from '@/trpc/server';

import { TemplateEditor } from './template-editor';

/** EVT-09: admins edit category templates (JSON definition, validated server-side). */
export default async function AdminTemplatesPage({
  params,
}: PageProps<'/[locale]/admin/templates'>) {
  await resolveLocale(params);
  const t = await getTranslations('AdminTemplates');
  const tAdmin = await getTranslations('Admin');
  const templates = await (await api()).admin.templates();
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <BackLink href="/admin">{tAdmin('title')}</BackLink>
      <PageHeader title={t('title')} description={t('hint')} />
      <ul className="mt-8 space-y-3">
        {templates.map((template) => (
          <li key={template.key}>
            <TemplateEditor
              templateKey={template.key}
              name={template.name}
              category={template.category.name}
              version={template.version}
              isActive={template.isActive}
              definition={JSON.stringify(template.definition, null, 2)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
