'use client';

import { formatDate, formatTime, type Locale } from '@doulisha/i18n';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageCircle, MessagesSquare, SendHorizontal } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { ItemMenu } from '@/components/doulisha/safety';
import { Button } from '@/components/ui/button';
import { fieldControlClass } from '@/components/ui/input';
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
      <Button asChild variant="outline" className={className}>
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
        className="w-full"
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
  const list = useRef<HTMLOListElement>(null);
  const count = thread.data?.messages.length ?? 0;

  // Keep the newest message in view inside the conversation panel.
  useEffect(() => {
    const element = list.current;
    if (element) element.scrollTop = element.scrollHeight;
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
      <div
        className="flex h-[min(68dvh,40rem)] min-h-96 flex-col gap-3 rounded-3xl border border-border/70 bg-card p-4 shadow-card"
        data-testid="chat-loading"
        aria-busy="true"
      >
        <span className="sr-only">{t('loading')}</span>
        <div className="h-12 w-3/5 animate-pulse self-start rounded-2xl bg-muted" />
        <div className="h-10 w-2/5 animate-pulse self-end rounded-2xl bg-primary-soft" />
        <div className="h-16 w-1/2 animate-pulse self-start rounded-2xl bg-muted" />
      </div>
    );
  }
  if (thread.isError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-3xl border border-border/70 bg-card px-6 py-12 text-center shadow-card"
      >
        <p className="text-sm text-muted-foreground">{errorMessage(thread.error)}</p>
        <Button variant="outline" onClick={() => void thread.refetch()}>
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
    <div className="flex h-[calc(100dvh-16rem)] min-h-[26rem] flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card sm:h-[min(70dvh,44rem)]">
      <ol
        ref={list}
        className="flex flex-1 flex-col gap-2 overflow-y-auto bg-background/40 p-4 sm:p-5"
        aria-live="polite"
        data-testid="chat-messages"
      >
        {messages.length === 0 ? (
          <li
            className="m-auto flex max-w-sm flex-col items-center gap-3 text-center text-sm text-muted-foreground"
            data-testid="chat-empty"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <MessagesSquare className="size-5" aria-hidden="true" />
            </span>
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
                <p className="my-2 self-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {message.day}
                </p>
              ) : null}
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-xs sm:max-w-[75%]',
                  message.mine
                    ? 'self-end rounded-ee-md bg-primary text-primary-foreground'
                    : 'self-start rounded-es-md border border-border/60 bg-card',
                )}
                data-testid="chat-message"
                data-mine={message.mine ? 'true' : 'false'}
              >
                {!message.mine ? (
                  <p className="mb-1 flex items-center gap-1 text-xs font-semibold" dir="auto">
                    {message.senderIsGuest ? (
                      message.senderName
                    ) : (
                      <Link href={`/members/${message.senderId}`} className="hover:underline">
                        {message.senderName}
                      </Link>
                    )}
                    {message.fromOrganizer ? (
                      <span className="ms-1.5 rounded-full bg-primary-soft px-2 py-0.5 font-semibold text-primary">
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
                <p className="break-words whitespace-pre-wrap" dir="auto">
                  {message.body}
                </p>
                <p
                  className={cn(
                    'ltr-nums mt-1 text-end text-[0.7rem]',
                    message.mine ? 'text-primary-foreground/75' : 'text-muted-foreground',
                  )}
                >
                  {formatTime(new Date(message.createdAt), locale)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <form
        onSubmit={(e) => void submit(e)}
        className="flex items-end gap-2 border-t border-border/70 bg-card p-3 sm:p-4"
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
          className={cn(fieldControlClass, 'max-h-40 min-h-11 flex-1 resize-none px-4 py-2.5')}
          data-testid="chat-input"
        />
        <Button
          type="submit"
          size="icon"
          className="shrink-0"
          disabled={!body.trim() || send.isPending}
          aria-label={t('send')}
          data-testid="chat-send"
        >
          {send.isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <SendHorizontal className="rtl:rotate-180" aria-hidden="true" />
          )}
        </Button>
      </form>
      {error ? (
        <p
          role="alert"
          className="border-t border-border/70 bg-destructive-soft px-4 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
