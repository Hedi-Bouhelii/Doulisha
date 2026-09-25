import { TRPCError } from '@trpc/server';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { resolveLocale } from '@/i18n/locale';
import { api } from '@/trpc/server';

import { StatusBadge } from '../../../status-badge';
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
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {data.event.title || data.template.name[locale]}
        </h1>
        <StatusBadge status={data.event.status} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {data.template.name[locale]} · {t('edit')}
      </p>
      <Wizard initial={data} profiles={profiles.map((p) => ({ id: p.id, name: p.name }))} />
    </div>
  );
}
