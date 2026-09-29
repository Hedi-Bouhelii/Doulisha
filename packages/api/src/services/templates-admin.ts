import type { Executor } from '@doulisha/db';
import { schema } from '@doulisha/db';
import type { Locale } from '@doulisha/i18n';
import { templateDefinitionSchema, type TemplateDefinitionData } from '@doulisha/templates';
import { asc, eq, sql } from 'drizzle-orm';

import { AppError } from '../errors';

/** Templates with their category, for the admin editor and the wizard's first step. */
export async function listTemplates(db: Executor, locale: Locale, activeOnly: boolean) {
  const rows = await db
    .select({ template: schema.templates, category: schema.categories })
    .from(schema.templates)
    .innerJoin(schema.categories, eq(schema.categories.id, schema.templates.categoryId))
    .orderBy(asc(schema.categories.sort), asc(schema.templates.key));
  return rows
    .filter((r) => !activeOnly || (r.template.isActive && r.category.isActive))
    .map(({ template, category }) => ({
      key: template.key,
      name: template.name[locale],
      names: template.name,
      model: template.model,
      isActive: template.isActive,
      version: template.version,
      definition: template.definition,
      category: {
        slug: category.slug,
        name: category.name[locale],
        icon: category.icon,
        accent: category.accent,
      },
    }));
}

/**
 * EVT-09: an admin edits a template (fields, brief, policy, modules, filters).
 * The definition is validated so a broken template never reaches the wizard;
 * the version increases on every change.
 */
export async function updateTemplate(
  db: Executor,
  key: string,
  input: { definition: unknown; isActive: boolean },
) {
  const parsed = templateDefinitionSchema.safeParse(input.definition);
  if (!parsed.success) {
    throw new AppError('BAD_REQUEST', 'errors.invalidTemplate', {
      issues: parsed.error.issues.slice(0, 10).map((i) => `${i.path.join('.')}: ${i.message}`),
    });
  }
  const [updated] = await db
    .update(schema.templates)
    .set({
      definition: parsed.data as TemplateDefinitionData,
      isActive: input.isActive,
      version: sql`${schema.templates.version} + 1`,
    })
    .where(eq(schema.templates.key, key))
    .returning({ key: schema.templates.key, version: schema.templates.version });
  if (!updated) throw new AppError('NOT_FOUND', 'errors.notFound');
  return updated;
}
