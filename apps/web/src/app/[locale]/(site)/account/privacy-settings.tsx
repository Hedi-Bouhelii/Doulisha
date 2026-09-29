'use client';

import { formatDate, type Locale } from '@doulisha/i18n';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Link, useRouter } from '@/i18n/navigation';
import { useErrorMessage } from '@/lib/errors';
import { useTRPC } from '@/trpc/client';

type Visibility = 'public' | 'private';

function Choice({
  id,
  label,
  hint,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  hint: string;
  value: Visibility;
  onChange: (value: Visibility) => void;
  options: Record<Visibility, string>;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-medium">{label}</legend>
      <p className="text-sm text-muted-foreground">{hint}</p>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as Visibility)} className="gap-1">
        {(['public', 'private'] as const).map((option) => (
          <div key={option} className="flex min-h-11 items-center gap-3">
            <RadioGroupItem id={`${id}-${option}`} value={option} data-testid={`${id}-${option}`} />
            <Label htmlFor={`${id}-${option}`}>{options[option]}</Label>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  );
}

/** ACC-06: who sees the profile and the events the member attends. */
export function PrivacySettings({
  userId,
  initial,
}: {
  userId: string;
  initial: { visibility: Visibility; attendanceVisibility: Visibility };
}) {
  const t = useTranslations('Privacy');
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [visibility, setVisibility] = useState(initial.visibility);
  const [attendance, setAttendance] = useState(initial.attendanceVisibility);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation(trpc.account.setPrivacy.mutationOptions());
  const changed = visibility !== initial.visibility || attendance !== initial.attendanceVisibility;

  return (
    <section aria-labelledby="privacy-title" className="mt-10" data-testid="privacy-settings">
      <h2 id="privacy-title" className="font-sans text-lg font-semibold">
        {t('title')}
      </h2>
      <div className="mt-4 space-y-6 rounded-2xl border border-border bg-card p-4">
        <Choice
          id="profile"
          label={t('profile')}
          hint={t('profileHint')}
          value={visibility}
          onChange={(v) => {
            setVisibility(v);
            setSaved(false);
          }}
          options={{ public: t('profilePublic'), private: t('profilePrivate') }}
        />
        <Choice
          id="attendance"
          label={t('attendance')}
          hint={t('attendanceHint')}
          value={attendance}
          onChange={(v) => {
            setAttendance(v);
            setSaved(false);
          }}
          options={{ public: t('attendancePublic'), private: t('attendancePrivate') }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="min-h-11 rounded-full"
            disabled={!changed || save.isPending}
            onClick={() =>
              save.mutate(
                { visibility, attendanceVisibility: attendance },
                {
                  onSuccess: () => {
                    setSaved(true);
                    router.refresh();
                  },
                  onError: (e) => setError(errorMessage(e)),
                },
              )
            }
            data-testid="privacy-save"
          >
            {t('save')}
          </Button>
          <Link
            href={`/members/${userId}`}
            className="min-h-11 content-center text-sm font-medium text-primary hover:underline"
          >
            {t('seeMyPage')}
          </Link>
          {saved ? (
            <span
              role="status"
              className="inline-flex items-center gap-1 text-sm text-success"
              data-testid="privacy-saved"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {t('saved')}
            </span>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** TRS-03: people the member blocked, with "Unblock". */
export function BlockedList({ people }: { people: { id: string; name: string; since: Date }[] }) {
  const t = useTranslations('Safety');
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const router = useRouter();
  const unblock = useMutation(trpc.safety.unblock.mutationOptions());
  return (
    <section aria-labelledby="blocked-title" className="mt-10" data-testid="blocked-list">
      <h2 id="blocked-title" className="font-sans text-lg font-semibold">
        {t('blockedTitle')}
      </h2>
      {people.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t('blockedNone')}</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
          {people.map((person) => (
            <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium" dir="auto">
                  {person.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('blockedSince', { date: formatDate(new Date(person.since), locale) })}
                </p>
              </div>
              <Button
                variant="outline"
                className="min-h-11 rounded-full"
                disabled={unblock.isPending}
                onClick={() =>
                  unblock.mutate({ userId: person.id }, { onSuccess: () => router.refresh() })
                }
                data-testid="unblock"
              >
                {t('unblock')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
