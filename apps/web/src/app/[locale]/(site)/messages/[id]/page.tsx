import { formatEventDateTime, type Locale } from '@doulisha/i18n';
import { TRPCError } from '@trpc/server';
import { CalendarDays, Lock } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ChatThread } from '@/components/doulisha/chat';
import { BackLink } from '@/components/doulisha/page';
import { resolveLocale } from '@/i18n/locale';
import { Link, redirect } from '@/i18n/navigation';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** One conversation (ADR 0021): an organizer thread or a private event's group chat. */
export default async function ConversationPage({ params }: PageProps<'/[locale]/messages/[id]'>) {
  const locale = (await resolveLocale(params)) as Locale;
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    redirect({ href: `/sign-in?next=${encodeURIComponent(`/messages/${id}`)}`, locale });
  }
  const thread = await (await api()).chat.thread({ conversationId: id }).catch((error: unknown) => {
    if (error instanceof TRPCError && ['NOT_FOUND', 'BAD_REQUEST'].includes(error.code)) {
      notFound();
    }
    throw error;
  });
  const t = await getTranslations('Chat');

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-8">
      <BackLink href="/messages">{t('inboxTitle')}</BackLink>
      <header className="mb-4 space-y-1.5">
        <h1
          className="font-display text-2xl font-bold tracking-tight sm:text-3xl"
          dir="auto"
          data-testid="chat-title"
        >
          {thread.title}
        </h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {thread.kind === 'group' ? (
            <span dir="auto">{t('groupOf', { event: thread.event.title })}</span>
          ) : (
            <Link
              href={`/events/${thread.event.slug}`}
              className="font-medium text-primary hover:underline"
              dir="auto"
            >
              {t('about', { event: thread.event.title })}
            </Link>
          )}
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden="true" />
            <span className="ltr-nums">{formatEventDateTime(thread.event.startsAt, locale)}</span>
          </span>
        </p>
        {thread.kind === 'organizer' && thread.role === 'member' ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" aria-hidden="true" />
            {t('privateHint')}
          </p>
        ) : null}
      </header>
      <ChatThread conversationId={thread.id} canModerate={!session!.user.isAnonymous} />
    </div>
  );
}
