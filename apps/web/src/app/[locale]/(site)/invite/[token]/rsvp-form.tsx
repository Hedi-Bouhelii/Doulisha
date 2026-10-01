'use client';

import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, CircleHelp, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Field } from '@/components/doulisha/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link, useRouter } from '@/i18n/navigation';
import { useErrorMessage } from '@/lib/errors';
import { ensureSession } from '@/lib/guest';
import { cn } from '@/lib/utils';
import { useTRPC } from '@/trpc/client';

type Status = 'going' | 'maybe' | 'not_going';

/** INV-03: going / maybe / can't come, with +1s and food notes. No account needed. */
export function RsvpForm({
  token,
  current,
  isMember,
}: {
  token: string;
  current: {
    status: string;
    plusOnes: number;
    dietaryNotes: string | null;
    guestName: string | null;
  } | null;
  isMember: boolean;
}) {
  const t = useTranslations('Invite');
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const answered = current && current.status !== 'invited' && current.status !== 'seen';
  const [editing, setEditing] = useState(!answered);
  const [status, setStatus] = useState<Status>((answered ? current.status : 'going') as Status);
  const [plusOnes, setPlusOnes] = useState(String(current?.plusOnes ?? 0));
  const [dietary, setDietary] = useState(current?.dietaryNotes ?? '');
  const [guestName, setGuestName] = useState(current?.guestName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const respond = useMutation(trpc.invitations.respond.mutationOptions());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await ensureSession();
      await respond.mutateAsync({
        token,
        status,
        plusOnes: status === 'going' ? Math.max(0, Math.min(10, Number(plusOnes) || 0)) : 0,
        dietaryNotes: dietary.trim() || null,
        guestName: isMember ? null : guestName.trim() || null,
      });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  if (!editing && answered) {
    return (
      <div
        className="space-y-3 rounded-2xl border border-border/70 bg-card shadow-card p-5 text-center"
        data-testid="rsvp-done"
      >
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden="true" />
        <p className="font-semibold">{t('thanks')}</p>
        <p className="text-muted-foreground">
          {t('yourAnswer', { status: t(`status.${current.status as Status}`) })}
        </p>
        <Button type="button" variant="outline" onClick={() => setEditing(true)}>
          {t('change')}
        </Button>
        {!isMember ? (
          <p className="text-sm">
            <Link href="/sign-in" className="font-semibold text-primary hover:underline">
              {t('createAccount')}
            </Link>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="space-y-6 rounded-3xl border border-border/70 bg-card p-6 shadow-card sm:p-8"
    >
      <fieldset>
        <legend className="mb-4 font-display text-xl font-semibold">{t('question')}</legend>
        <div className="grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup">
          {(['going', 'maybe', 'not_going'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={status === value}
              onClick={() => setStatus(value)}
              data-testid={`rsvp-${value}`}
              className={cn(
                'flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 text-sm font-semibold transition-[background-color,border-color,color,box-shadow] duration-150',
                status === value
                  ? 'border-primary bg-primary text-primary-foreground shadow-card'
                  : 'border-border/80 bg-background hover:border-primary/40 hover:bg-primary-soft/50',
              )}
            >
              {(() => {
                const Icon = { going: CheckCircle2, maybe: CircleHelp, not_going: XCircle }[value];
                return <Icon className="size-5" aria-hidden="true" />;
              })()}
              {t(value === 'not_going' ? 'notGoing' : value)}
            </button>
          ))}
        </div>
      </fieldset>
      {!isMember ? (
        <Field id="guest-name" label={t('yourName')}>
          <Input
            id="guest-name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            required
            minLength={2}
            maxLength={80}
            className="h-11"
            data-testid="rsvp-name"
          />
        </Field>
      ) : null}
      {status === 'going' ? (
        <Field id="plus-ones" label={t('plusOnes')} className="max-w-40">
          <Input
            id="plus-ones"
            type="number"
            inputMode="numeric"
            min={0}
            max={10}
            value={plusOnes}
            onChange={(e) => setPlusOnes(e.target.value)}
            className="h-11"
          />
        </Field>
      ) : null}
      <Field id="dietary" label={t('dietary')}>
        <Textarea
          id="dietary"
          value={dietary}
          onChange={(e) => setDietary(e.target.value)}
          maxLength={300}
          rows={2}
        />
      </Field>
      {error ? (
        <p
          role="alert"
          className="rounded-2xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending} data-testid="rsvp-send">
        {pending ? t('sending') : t('send')}
      </Button>
    </form>
  );
}
