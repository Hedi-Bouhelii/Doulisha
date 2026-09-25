import { getTranslations } from 'next-intl/server';

import { resolveLocale } from '@/i18n/locale';
import { api } from '@/trpc/server';

import { TemplateEditor } from './template-editor';

/** EVT-09: admins edit category templates (JSON definition, validated server-side). */
export default async function AdminTemplatesPage({
  params,
}: PageProps<'/[locale]/admin/templates'>) {
  await resolveLocale(params);
  const t = await getTranslations('AdminTemplates');
  const templates = await (await api()).admin.templates();
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="mt-1 text-muted-foreground">{t('hint')}</p>
      <ul className="mt-6 space-y-3">
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
