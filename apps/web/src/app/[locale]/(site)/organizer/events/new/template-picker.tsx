'use client';

import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Globe2, Loader2, PartyPopper, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
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

/** Demo photos per template (seed images); other templates show their category colour. */
const templatePhotos: Record<string, string> = {
  hiking_trip: '/images/events/ain-draham-hike.webp',
  concert_party: '/images/events/live-music-night.webp',
  workshop_class: '/images/events/pottery-sidi-bou-said.webp',
  sports_session: '/images/events/beach-volleyball.webp',
};

/** Templates with a one-line description in the messages (NewEvent.templates.*). */
const described = new Set(['hiking_trip', 'concert_party', 'workshop_class', 'sports_session']);

/**
 * EVT-01 step zero. First: a public event or a private invitation. Then one
 * large card per template, with a photo, what it is for and who publishes it.
 */
export function TemplatePicker({
  templates,
  profiles,
}: {
  templates: TemplateOption[];
  profiles: { id: string; name: string }[];
}) {
  const t = useTranslations('NewEvent');
  const tWizard = useTranslations('Wizard');
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [publishAs, setPublishAs] = useState(profiles[0]?.id ?? '');
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const create = useMutation(trpc.editor.create.mutationOptions());

  async function pick(templateKey: string) {
    setError(null);
    setPicked(templateKey);
    try {
      const { id } = await create.mutateAsync({
        templateKey,
        organizerProfileId: publishAs || null,
      });
      router.push(`/organizer/events/${id}/edit`);
    } catch (e) {
      setPicked(null);
      setError(errorMessage(e));
    }
  }

  return (
    <div className="mt-6 space-y-8">
      {/* Public or private: two different flows. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-2xl border-2 border-primary bg-primary/5 p-4">
          <Globe2 className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="font-semibold">{t('publicTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('publicHint')}</p>
          </div>
        </div>
        <Link
          href="/host/new"
          className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-highlight hover:shadow-sm"
          data-testid="go-private"
        >
          <PartyPopper className="mt-0.5 size-6 shrink-0 text-highlight" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t('privateTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('privateHint')}</p>
          </div>
          <ArrowRight
            className="mt-1 size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 rtl:rotate-180"
            aria-hidden="true"
          />
        </Link>
      </div>

      <section aria-labelledby="choose-template" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="choose-template" className="font-sans text-xl font-semibold">
            {t('chooseTemplate')}
          </h2>
          {profiles.length > 0 ? (
            <Field id="publish-as" label={tWizard('publishAs')} className="w-full sm:w-64">
              <NativeSelect
                id="publish-as"
                value={publishAs}
                onChange={(e) => setPublishAs(e.target.value)}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value="">{tWizard('myself')}</option>
              </NativeSelect>
            </Field>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserRound className="size-4" aria-hidden="true" />
              {t('noProfile')}{' '}
              <Link
                href="/organizer/profile"
                className="font-semibold text-primary hover:underline"
              >
                {t('createProfile')}
              </Link>
            </p>
          )}
        </div>

        {error ? (
          <p role="alert" className="rounded-lg bg-highlight-soft p-3 text-sm text-highlight">
            {error}
          </p>
        ) : null}

        <ul className="grid gap-4 sm:grid-cols-2">
          {templates.map((tpl) => {
            const accent = accentOf(tpl.category.accent);
            const photo = templatePhotos[tpl.key];
            const busy = picked === tpl.key;
            return (
              <li key={tpl.key}>
                <button
                  type="button"
                  onClick={() => void pick(tpl.key)}
                  disabled={create.isPending}
                  data-testid={`template-${tpl.key}`}
                  className="group flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-start shadow-sm transition hover:shadow-md disabled:opacity-60"
                >
                  <div className={cn('relative aspect-[16/7] w-full', accent.tile)}>
                    {photo ? (
                      <Image
                        src={photo}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 50vw, 100vw"
                        className="object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <CategoryIcon
                        name={tpl.category.icon}
                        className="absolute inset-0 m-auto size-12 opacity-60"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={cn(
                        'absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                        accent.tile,
                      )}
                    >
                      <CategoryIcon
                        name={tpl.category.icon}
                        className="size-3.5"
                        aria-hidden="true"
                      />
                      {tpl.category.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold">{tpl.name}</p>
                      {described.has(tpl.key) ? (
                        <p className="text-sm text-muted-foreground">
                          {t(`templates.${tpl.key as 'hiking_trip'}`)}
                        </p>
                      ) : null}
                    </div>
                    {busy ? (
                      <Loader2
                        className="size-5 shrink-0 animate-spin text-primary"
                        aria-hidden="true"
                      />
                    ) : (
                      <ArrowRight
                        className="size-5 shrink-0 text-muted-foreground transition group-hover:text-primary rtl:rotate-180"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
