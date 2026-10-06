import { formatEventDateTime } from '@doulisha/i18n';
import { CalendarDays, PartyPopper } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

import { GroupChatButton } from '@/components/doulisha/chat';
import { EmptyState } from '@/components/doulisha/empty-state';
import { PageHeader } from '@/components/doulisha/page';
import { Button } from '@/components/ui/button';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { absoluteUrl } from '@/lib/site';
import { api } from '@/trpc/server';

import { InviteLinkActions } from './invite-link-actions';

/** The member's private events, each with its invitation link (INV-01/02). */
export default async function HostPage({ params }: PageProps<'/[locale]/host'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations('Host');
  const events = await (await api()).invitations.hosted();

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('myEvents')}
        description={t('newHint')}
        actions={
          <Button asChild>
            <Link href="/host/new" data-testid="host-new">
              <PartyPopper aria-hidden="true" />
              {t('newTitle')}
            </Link>
          </Button>
        }
      />
      {events.length === 0 ? (
        <EmptyState icon={PartyPopper} title={t('noEvents')} hint={t('newHint')} />
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-card sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-highlight-soft">
                  {event.coverUrl ? (
                    <Image src={event.coverUrl} alt="" fill sizes="64px" className="object-cover" />
                  ) : (
                    <PartyPopper className="size-6 text-highlight" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold" dir="auto">
                    {event.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                    {formatEventDateTime(event.startsAt, locale)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <GroupChatButton eventId={event.id} />
                {event.token ? (
                  <InviteLinkActions
                    url={absoluteUrl(`/${locale}/invite/${event.token}`)}
                    title={event.title}
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
