'use client';

import { formatDate, formatTime, type Locale } from '@doulisha/i18n';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageCircle, MessagesSquare, SendHorizontal } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { ItemMenu } from '@/components/doulisha/safety';
import { Button } from '@/components/ui/button';
import { Link, useRouter } from '@/i18n/navigation';
import { useErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { useTRPC } from '@/trpc/client';

/** How often an open conversation asks for new messages (ADR 0021). */
const POLL_MS = 5000;

/**
 * COM-05 "Ask the organizer" on an event page. Visitors are sent to sign in
 * first and come back to the event.
 */
export function AskOrganizerButton({
  eventId,
  eventPath,
  signedIn,
  className,
}: {
  eventId: string;
  eventPath: string;
  signedIn: boolean;
  className?: string;
}) {
  const t = useTranslations('Chat');
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const open = useMutation(trpc.chat.openWithOrganizer.mutationOptions());

  if (!signedIn) {
    return (
      <Button asChild variant="outline" className={cn('min-h-11 rounded-full', className)}>
        <Link href={`/sign-in?next=${encodeURIComponent(eventPath)}`} data-testid="ask-organizer">
          <MessageCircle aria-hidden="true" />
          {t('askOrganizer')}
        </Link>
      </Button>
    );
  }
  return (
    <div className={className}>
      <Button
        variant="outline"
        className="min-h-11 w-full rounded-full"
        disabled={open.isPending}
        onClick={() => {
          setError(null);
          open.mutate(
            { eventId },
            {
              onSuccess: ({ conversationId }) => router.push(`/messages/${conversationId}`),
              onError: (e) => setError(errorMessage(e)),
            },
          );
        }}
        data-testid="ask-organizer"
      >
        {open.isPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <MessageCircle aria-hidden="true" />
        )}
        {t('askOrganizer')}
      </Button>
      {error ? (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** COM-06: opens the group chat of a private event (hosts and guests going or maybe). */
export function GroupChatButton({ eventId }: { eventId: string }) {
  const t = useTranslations('Chat');
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const open = useMutation(trpc.chat.openGroup.mutationOptions());
  return (
    <div>
      <Button
        variant="outline"
        className="min-h-11 rounded-full"
        disabled={open.isPending}
        onClick={() => {
          setError(null);
          open.mutate(
            { eventId },
            {
              onSuccess: ({ conversationId }) => router.push(`/messages/${conversationId}`),
              onError: (e) => setError(errorMessage(e)),
            },
          );
        }}
        data-testid="open-group-chat"
      >
        {open.isPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <MessagesSquare aria-hidden="true" />
        )}
        {t('groupChat')}
      </Button>
      {error ? (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * An open conversation: messages oldest first, the newest at the bottom, and
 * the composer. Polls every few seconds while the tab is visible.
 */
export function ChatThread({
  conversationId,
  canModerate,
}: {
  conversationId: string;
  /** Members can report messages and block senders; guests cannot. */
  canModerate: boolean;
}) {
  const t = useTranslations('Chat');
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const threadOptions = trpc.chat.thread.queryOptions({ conversationId });
  const thread = useQuery({
    ...threadOptions,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  });
  const send = useMutation(trpc.chat.send.mutationOptions());
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLLIElement>(null);
  const count = thread.data?.messages.length ?? 0;

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [count]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const text = body.trim();
    if (!text || send.isPending) return;
    setError(null);
    try {
      await send.mutateAsync({ conversationId, body: text });
      setBody('');
      // A poll still running from before the send would bring back the old list.
      await queryClient.cancelQueries({ queryKey: threadOptions.queryKey });
      await queryClient.invalidateQueries({ queryKey: threadOptions.queryKey });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (thread.isPending) {
    return (
      <div className="flex min-h-60 items-center justify-center" data-testid="chat-loading">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">{t('loading')}</span>
      </div>
    );
  }
  if (thread.isError) {
    return (
      <div role="alert" className="rounded-xl bg-muted p-4 text-sm">
        <p>{errorMessage(thread.error)}</p>
        <Button variant="outline" className="mt-3 min-h-11" onClick={() => void thread.refetch()}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  const { kind, role } = thread.data;
  // A date line before the first message of each day.
  const messages = thread.data.messages.map((message, index, all) => {
    const day = formatDate(new Date(message.createdAt), locale);
    const previous = all[index - 1];
    const showDay = !previous || formatDate(new Date(previous.createdAt), locale) !== day;
    return { ...message, day, showDay };
  });
  return (
    <div className="flex flex-col">
      <ol
        className="flex min-h-60 flex-col gap-2 rounded-2xl border border-border bg-card p-3 sm:p-4"
        aria-live="polite"
        data-testid="chat-messages"
      >
        {messages.length === 0 ? (
          <li
            className="m-auto max-w-sm text-center text-sm text-muted-foreground"
            data-testid="chat-empty"
          >
            {kind === 'group'
              ? t('emptyGroup')
              : role === 'member'
                ? t('emptyAsk')
                : t('emptyOrganizer')}
          </li>
        ) : null}
        {messages.map((message) => {
          return (
            <li key={message.id} className="contents">
              {message.showDay ? (
                <p className="my-2 text-center text-xs text-muted-foreground">{message.day}</p>
              ) : null}
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                  message.mine
                    ? 'self-end rounded-ee-sm bg-primary text-primary-foreground'
                    : 'self-start rounded-es-sm bg-muted',
                )}
                data-testid="chat-message"
                data-mine={message.mine ? 'true' : 'false'}
              >
                {!message.mine ? (
                  <p className="mb-0.5 flex items-center gap-1 text-xs font-semibold" dir="auto">
                    {message.senderIsGuest ? (
                      message.senderName
                    ) : (
                      <Link href={`/members/${message.senderId}`} className="hover:underline">
                        {message.senderName}
                      </Link>
                    )}
                    {message.fromOrganizer ? (
                      <span className="ms-1.5 rounded-full bg-primary/10 px-1.5 font-normal text-primary">
                        {t('organizerBadge')}
                      </span>
                    ) : null}
                    {canModerate ? (
                      <span className="-my-2 ms-auto">
                        <ItemMenu
                          label={t('messageMenu')}
                          report={{ type: 'message', id: message.id }}
                          author={{ id: message.senderId, name: message.senderName }}
                          onBlocked={() =>
                            void queryClient.invalidateQueries({ queryKey: threadOptions.queryKey })
                          }
                        />
                      </span>
                    ) : null}
                  </p>
                ) : null}
                <p className="whitespace-pre-wrap break-words" dir="auto">
                  {message.body}
                </p>
                <p
                  className={cn(
                    'ltr-nums mt-0.5 text-end text-[0.7rem]',
                    message.mine ? 'text-primary-foreground/70' : 'text-muted-foreground',
                  )}
                >
                  {formatTime(new Date(message.createdAt), locale)}
                </p>
              </div>
            </li>
          );
        })}
        <li ref={bottom} aria-hidden="true" className="h-0" />
      </ol>

      <form
        onSubmit={(e) => void submit(e)}
        className="sticky bottom-0 mt-3 flex items-end gap-2 bg-background py-2"
      >
        <label htmlFor="chat-body" className="sr-only">
          {t('placeholder')}
        </label>
        <textarea
          id="chat-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={1}
          maxLength={2000}
          dir="auto"
          placeholder={t('placeholder')}
          className="max-h-40 min-h-11 flex-1 resize-y rounded-2xl border border-input bg-card px-3 py-2.5 text-base focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          data-testid="chat-input"
        />
        <Button
          type="submit"
          size="icon"
          className="size-11 shrink-0 rounded-full"
          disabled={!body.trim() || send.isPending}
          aria-label={t('send')}
          data-testid="chat-send"
        >
          {send.isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <SendHorizontal className="rtl:-scale-x-100" aria-hidden="true" />
          )}
        </Button>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
