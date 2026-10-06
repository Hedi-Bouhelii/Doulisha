'use client';

import { formatDate, type Locale } from '@doulisha/i18n';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Eye, UserX } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { SectionHeading } from '@/components/doulisha/page';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Link, useRouter } from '@/i18n/navigation';
import { useErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
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
    <fieldset className="space-y-3">
      <div>
        <legend className="font-semibold">{label}</legend>
        <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
      </div>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as Visibility)}
        className="grid gap-2 sm:grid-cols-2"
      >
        {(['public', 'private'] as const).map((option) => (
          <Label
            key={option}
            htmlFor={`${id}-${option}`}
            className={cn(
              'flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 font-normal transition-[background-color,border-color] duration-150',
              value === option
                ? 'border-primary bg-primary-soft/50'
                : 'border-border/80 hover:border-primary/35 hover:bg-primary-soft/25',
            )}
          >
            <RadioGroupItem id={`${id}-${option}`} value={option} data-testid={`${id}-${option}`} />
            {options[option]}
          </Label>
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
    <section aria-labelledby="privacy-title" data-testid="privacy-settings">
      <SectionHeading id="privacy-title" icon={Eye} title={t('title')} />
      <div className="space-y-6 rounded-2xl border border-border/70 bg-card p-4 shadow-card sm:p-5">
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
        <div className="flex flex-wrap items-center gap-3 border-t border-border/70 pt-5">
          <Button
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
            className="min-h-11 content-center text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('seeMyPage')}
          </Link>
          {saved ? (
            <span
              role="status"
              className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-sm font-medium text-success"
              data-testid="privacy-saved"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {t('saved')}
            </span>
          ) : null}
        </div>
        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-2xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
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
    <section aria-labelledby="blocked-title" data-testid="blocked-list">
      <SectionHeading id="blocked-title" icon={UserX} title={t('blockedTitle')} />
      {people.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
          {t('blockedNone')}
        </p>
      ) : (
        <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
          {people.map((person) => (
            <li
              key={person.id}
              className="flex flex-wrap items-center justify-between gap-2 p-4 sm:px-5"
            >
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
