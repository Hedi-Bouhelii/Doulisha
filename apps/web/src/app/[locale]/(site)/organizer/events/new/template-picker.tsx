'use client';

import { useMutation } from '@tanstack/react-query';
import { PartyPopper } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { accentOf, CategoryIcon } from '@/components/doulisha/category-icon';
import { Field, NativeSelect } from '@/components/doulisha/form-field';
import { Link, useRouter } from '@/i18n/navigation';
import { useErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { useTRPC } from '@/trpc/client';

interface TemplateOption {
  key: string;
  name: string;
  category: { slug: string; name: string; icon: string; accent: string };
}

/** Template tiles grouped by category, plus "publish as" (member or organizer profile). */
export function TemplatePicker({
  templates,
  profiles,
}: {
  templates: TemplateOption[];
  profiles: { id: string; name: string }[];
}) {
  const t = useTranslations('Wizard');
  const tNav = useTranslations('Nav');
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [publishAs, setPublishAs] = useState(profiles[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const create = useMutation(trpc.editor.create.mutationOptions());

  async function pick(templateKey: string) {
    setError(null);
    try {
      const { id } = await create.mutateAsync({
        templateKey,
        organizerProfileId: publishAs || null,
      });
      router.push(`/organizer/events/${id}/edit`);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const groups = new Map<string, TemplateOption[]>();
  for (const tpl of templates) {
    groups.set(tpl.category.slug, [...(groups.get(tpl.category.slug) ?? []), tpl]);
  }

  return (
    <div className="mt-6 space-y-8">
      <Field id="publish-as" label={t('publishAs')} className="max-w-sm">
        <NativeSelect
          id="publish-as"
          value={publishAs}
          onChange={(e) => setPublishAs(e.target.value)}
        >
          <option value="">{t('myself')}</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      {error ? (
        <p role="alert" className="rounded-lg bg-highlight-soft p-3 text-sm text-highlight">
          {error}
        </p>
      ) : null}

      {[...groups.values()].map((group) => {
        const category = group[0]!.category;
        const accent = accentOf(category.accent);
        return (
          <section key={category.slug} aria-labelledby={`cat-${category.slug}`}>
            <h2
              id={`cat-${category.slug}`}
              className="mb-3 flex items-center gap-2 font-sans text-lg font-semibold"
            >
              <CategoryIcon
                name={category.icon}
                className={cn('size-5', accent.icon)}
                aria-hidden="true"
              />
              {category.name}
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {group.map((tpl) => (
                <li key={tpl.key}>
                  <button
                    type="button"
                    onClick={() => void pick(tpl.key)}
                    disabled={create.isPending}
                    data-testid={`template-${tpl.key}`}
                    className={cn(
                      'flex min-h-20 w-full items-center gap-3 rounded-xl p-4 text-start font-semibold transition hover:shadow-md disabled:opacity-60',
                      accent.tile,
                    )}
                  >
                    <CategoryIcon
                      name={category.icon}
                      className="size-6 shrink-0"
                      aria-hidden="true"
                    />
                    {tpl.name}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <Link
        href="/host/new"
        className="flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <PartyPopper className="size-4" aria-hidden="true" />
        {tNav('host')}
      </Link>
    </div>
  );
}
