import { TRPCError } from '@trpc/server';
import { MountainSnow } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { BackLink } from '@/components/doulisha/page';
import { StatusBadge } from '@/components/doulisha/status-badge';
import { resolveLocale } from '@/i18n/locale';
import { api } from '@/trpc/server';

import { Wizard } from './wizard';

/** EVT-01..06: edit a draft (or a published event) step by step. */
export default async function EditEventPage({
  params,
}: PageProps<'/[locale]/organizer/events/[id]/edit'>) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  const caller = await api();
  const data = await caller.editor.get({ eventId: id }).catch((error: unknown) => {
    // Unknown ids and other people's events look the same: not found.
    if (
      error instanceof TRPCError &&
      ['NOT_FOUND', 'FORBIDDEN', 'BAD_REQUEST'].includes(error.code)
    ) {
      notFound();
    }
    throw error;
  });
  const profiles = await caller.organizer.profiles();
  const t = await getTranslations('Organizer');

  return (
    <div>
      <BackLink href="/organizer">{t('events')}</BackLink>
      <Wizard
        initial={data}
        profiles={profiles.map((p) => ({ id: p.id, name: p.name }))}
        header={
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-highlight text-highlight-foreground shadow-card sm:size-16">
              <MountainSnow className="size-7" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1
                  dir="auto"
                  className="font-display text-2xl leading-tight font-bold tracking-tight text-balance sm:text-3xl"
                >
                  {data.event.title || data.template.name[locale]}
                </h1>
                <StatusBadge status={data.event.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.template.name[locale]} · {t('edit')}
              </p>
            </div>
          </div>
        }
      />
    </div>
  );
}
