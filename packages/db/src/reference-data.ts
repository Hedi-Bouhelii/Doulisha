import { categories as categoryDefs, templateDefinitions } from '@doulisha/templates';
import { inArray } from 'drizzle-orm';

import type { Executor } from './client';
import * as s from './schema';

/**
 * Categories and templates every database needs (EVT-09): without them nobody
 * can create an event. Adds the missing ones only, so admin edits made in
 * /admin/templates survive; `db:sync-templates` is the tool that overwrites.
 */
export async function ensureReferenceData(db: Executor) {
  const addedCategories = await db
    .insert(s.categories)
    .values(categoryDefs.map((c) => ({ ...c })))
    .onConflictDoNothing({ target: s.categories.slug })
    .returning({ slug: s.categories.slug });

  const categoryRows = await db
    .select({ id: s.categories.id, slug: s.categories.slug })
    .from(s.categories)
    .where(
      inArray(
        s.categories.slug,
        templateDefinitions.map((t) => t.categorySlug),
      ),
    );
  const categoryId = (slug: string) => {
    const row = categoryRows.find((c) => c.slug === slug);
    if (!row) throw new Error(`Category "${slug}" is missing`);
    return row.id;
  };

  const addedTemplates = await db
    .insert(s.templates)
    .values(
      templateDefinitions.map((t) => ({
        key: t.key,
        categoryId: categoryId(t.categorySlug),
        model: t.model,
        name: t.name,
        definition: t.definition,
        isActive: t.isActive,
      })),
    )
    .onConflictDoNothing({ target: s.templates.key })
    .returning({ key: s.templates.key });

  return { categories: addedCategories.length, templates: addedTemplates.length };
}
