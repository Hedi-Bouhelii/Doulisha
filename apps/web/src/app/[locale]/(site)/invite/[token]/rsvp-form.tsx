'use client';

import { useMutation } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
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
        className="space-y-3 rounded-xl border border-border bg-card p-5 text-center"
        data-testid="rsvp-done"
      >
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden="true" />
        <p className="font-semibold">{t('thanks')}</p>
        <p className="text-muted-foreground">
          {t('yourAnswer', { status: t(`status.${current.status as Status}`) })}
        </p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 rounded-full"
          onClick={() => setEditing(true)}
        >
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
      className="space-y-5 rounded-xl border border-border bg-card p-5"
    >
      <fieldset>
        <legend className="mb-3 text-lg font-semibold">{t('question')}</legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {(['going', 'maybe', 'not_going'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={status === value}
              onClick={() => setStatus(value)}
              data-testid={`rsvp-${value}`}
              className={cn(
                'min-h-12 rounded-xl border px-2 text-sm font-semibold transition',
                status === value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-accent',
              )}
            >
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
        <p role="alert" className="rounded-lg bg-highlight-soft p-3 text-sm text-highlight">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="min-h-11 w-full rounded-full"
        disabled={pending}
        data-testid="rsvp-send"
      >
        {pending ? t('sending') : t('send')}
      </Button>
    </form>
  );
}
