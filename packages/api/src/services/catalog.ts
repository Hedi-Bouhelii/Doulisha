import type { Db } from '@doulisha/db';
import { schema } from '@doulisha/db';
import type { Locale } from '@doulisha/i18n';
import { asc, eq } from 'drizzle-orm';

export interface CategoryDto {
  slug: string;
  name: string;
  icon: string;
  accent: string;
}

/** Active categories in display order, named in the viewer's language. */
export async function listCategories(db: Db, locale: Locale): Promise<CategoryDto[]> {
  const rows = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.isActive, true))
    .orderBy(asc(schema.categories.sort));
  return rows.map((c) => ({ slug: c.slug, name: c.name[locale], icon: c.icon, accent: c.accent }));
}
