import { formatDate, type Locale } from '@doulisha/i18n';
import { MessagesSquare, UsersRound } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/doulisha/empty-state';
import { initials } from '@/components/doulisha/friends-going';
import { Container, PageHeader } from '@/components/doulisha/page';
import { Button } from '@/components/ui/button';
import { resolveLocale } from '@/i18n/locale';
import { Link, redirect } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/messages'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'Chat' });
  return { title: t('inboxTitle'), robots: { index: false, follow: false } };
}

/** Every conversation of the member or guest, latest first (ADR 0021). */
export default async function MessagesPage({ params }: PageProps<'/[locale]/messages'>) {
  const locale = (await resolveLocale(params)) as Locale;
  const session = await getSession();
  if (!session) redirect({ href: `/sign-in?next=${encodeURIComponent('/messages')}`, locale });
  const inbox = await (await api()).chat.inbox();
  const t = await getTranslations('Chat');
  const tNav = await getTranslations('Nav');

  return (
    <Container size="narrow">
      <PageHeader title={t('inboxTitle')} description={t('inboxIntro')} />
      {inbox.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={MessagesSquare}
          title={t('inboxEmpty')}
          hint={t('inboxEmptyHint')}
          action={
            <Button asChild>
              <Link href="/explore">{tNav('explore')}</Link>
            </Button>
          }
        />
      ) : (
        <ul
          className="mt-8 divide-y divide-border/70 overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card"
          data-testid="inbox"
        >
          {inbox.map((item) => {
            const unread = item.unread > 0;
            return (
              <li key={item.id}>
                <Link
                  href={`/messages/${item.id}`}
                  className="flex items-start gap-3.5 p-4 transition-colors hover:bg-accent sm:p-5"
                  data-testid="inbox-item"
                >
                  <span
                    className={cn(
                      'flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                      item.kind === 'group'
                        ? 'bg-highlight-soft text-highlight'
                        : 'bg-primary-soft text-primary',
                    )}
                  >
                    {item.kind === 'group' ? (
                      <UsersRound className="size-5" aria-hidden="true" />
                    ) : (
                      initials(item.title)
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span
                        className={cn('truncate', unread ? 'font-bold' : 'font-semibold')}
                        dir="auto"
                      >
                        {item.title}
                      </span>
                      {item.lastMessageAt ? (
                        <span className="ltr-nums shrink-0 text-xs text-muted-foreground">
                          {formatDate(item.lastMessageAt, locale)}
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground" dir="auto">
                      {item.kind === 'group'
                        ? t('groupOf', { event: item.eventTitle })
                        : t('about', { event: item.eventTitle })}
                    </span>
                    <span className="mt-1.5 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'truncate text-sm',
                          unread ? 'font-medium text-foreground' : 'text-muted-foreground',
                        )}
                        dir="auto"
                      >
                        {item.lastMessage ?? t('noMessagesYet')}
                      </span>
                      {unread ? (
                        <span
                          className="ltr-nums inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-highlight px-1.5 text-xs leading-5 font-semibold text-highlight-foreground"
                          data-testid="inbox-unread"
                        >
                          {item.unread}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
