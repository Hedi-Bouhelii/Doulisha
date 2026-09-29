import { formatDate, type Locale } from '@doulisha/i18n';
import { MessagesSquare } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/doulisha/empty-state';
import { resolveLocale } from '@/i18n/locale';
import { Link, redirect } from '@/i18n/navigation';
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

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold sm:text-4xl">{t('inboxTitle')}</h1>
      <p className="mt-2 text-muted-foreground">{t('inboxIntro')}</p>
      {inbox.length === 0 ? (
        <EmptyState className="mt-8" title={t('inboxEmpty')} hint={t('inboxEmptyHint')} />
      ) : (
        <ul
          className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card"
          data-testid="inbox"
        >
          {inbox.map((item) => (
            <li key={item.id}>
              <Link
                href={`/messages/${item.id}`}
                className="flex items-start gap-3 p-4 hover:bg-accent"
                data-testid="inbox-item"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <MessagesSquare className="size-5 text-primary" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold" dir="auto">
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
                  <span className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-muted-foreground" dir="auto">
                      {item.lastMessage ?? t('noMessagesYet')}
                    </span>
                    {item.unread > 0 ? (
                      <span
                        className="ltr-nums shrink-0 rounded-full bg-highlight px-2 text-xs font-semibold text-white"
                        data-testid="inbox-unread"
                      >
                        {item.unread}
                      </span>
                    ) : null}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
