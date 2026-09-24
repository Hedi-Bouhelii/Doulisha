'use client';

import type { OutboxEntry } from '@doulisha/notifications';
import { useQuery } from '@tanstack/react-query';
import { Mail, MessageSquare, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/doulisha/empty-state';
import { Button } from '@/components/ui/button';

/** Polls the dev outbox every 2 seconds so new OTP codes appear on their own. */
export function OutboxList() {
  const t = useTranslations('Dev');
  const { data, refetch, isFetching } = useQuery({
    queryKey: ['dev-outbox'],
    queryFn: async () => {
      const response = await fetch('/api/dev/outbox', { cache: 'no-store' });
      return ((await response.json()) as { messages: OutboxEntry[] }).messages;
    },
    refetchInterval: 2000,
  });

  return (
    <div className="mt-6 space-y-3">
      <Button variant="outline" className="min-h-11" onClick={() => void refetch()}>
        <RefreshCw className={isFetching ? 'animate-spin' : ''} aria-hidden="true" />
        {t('refresh')}
      </Button>
      {data && data.length === 0 ? <EmptyState title={t('outboxEmpty')} /> : null}
      <ul className="space-y-3" data-testid="outbox">
        {data?.map((m) => (
          <li key={`${m.sentAt}-${m.to}`} className="rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              {m.channel === 'sms' ? (
                <MessageSquare className="size-4" aria-hidden="true" />
              ) : (
                <Mail className="size-4" aria-hidden="true" />
              )}
              <span className="ltr-nums">{m.to}</span> ·{' '}
              <time className="ltr-nums">{new Date(m.sentAt).toLocaleTimeString()}</time>
            </p>
            {m.channel === 'sms' ? (
              <p className="ltr-nums mt-2 font-mono text-lg" data-testid="outbox-sms">
                {m.body}
              </p>
            ) : (
              <>
                <p className="mt-2 font-medium">{m.subject}</p>
                <p className="mt-1 text-sm break-all whitespace-pre-line" dir="ltr">
                  {m.text}
                </p>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
