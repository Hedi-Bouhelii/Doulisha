import { formatEventDateTime } from '@doulisha/i18n';
import { PartyPopper } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

import { EmptyState } from '@/components/doulisha/empty-state';
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t('myEvents')}</h1>
        <Button asChild className="min-h-11 rounded-full">
          <Link href="/host/new" data-testid="host-new">
            <PartyPopper aria-hidden="true" />
            {t('newTitle')}
          </Link>
        </Button>
      </div>
      {events.length === 0 ? (
        <EmptyState title={t('noEvents')} hint={t('newHint')} />
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {event.coverUrl ? (
                    <Image src={event.coverUrl} alt="" fill sizes="64px" className="object-cover" />
                  ) : (
                    <PartyPopper
                      className="m-auto mt-5 size-6 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatEventDateTime(event.startsAt, locale)}
                  </p>
                </div>
              </div>
              {event.token ? (
                <InviteLinkActions
                  url={absoluteUrl(`/${locale}/invite/${event.token}`)}
                  title={event.title}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
