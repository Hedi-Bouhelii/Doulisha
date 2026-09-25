'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

import {
  AccountTypeCards,
  type AccountType,
  FormError,
  PasswordField,
} from '@/components/auth/auth-parts';
import { Field } from '@/components/doulisha/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from '@/i18n/navigation';
import { useErrorMessage } from '@/lib/errors';
import { useTRPC } from '@/trpc/client';

const MIN_PASSWORD = 8;

export function SetupForm({
  next,
  initial,
  needsPassword,
  isOrganizer,
  initialType,
  cities,
}: {
  next: string;
  initial: { name: string; city: string };
  needsPassword: boolean;
  isOrganizer: boolean;
  initialType: AccountType;
  cities: string[];
}) {
  const t = useTranslations('Auth');
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [name, setName] = useState(initial.name);
  const [city, setCity] = useState(initial.city);
  const [password, setPassword] = useState('');
  const [type, setType] = useState<AccountType>(isOrganizer ? 'organizer' : initialType);
  const [error, setError] = useState<string | null>(null);
  const complete = useMutation(trpc.account.completeSignUp.mutationOptions());

  const passwordOk = !needsPassword || password.length >= MIN_PASSWORD;
  const ready = name.trim().length >= 2 && passwordOk;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setError(null);
    try {
      const result = await complete.mutateAsync({
        name: name.trim(),
        city: city.trim() || null,
        accountType: type,
        ...(needsPassword ? { password } : {}),
      });
      if (result.organizerProfileId && !isOrganizer) {
        router.push(`/organizer/onboarding?next=${encodeURIComponent(next)}`);
      } else {
        router.push(next);
      }
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5" noValidate>
      <Field id="name" label={t('nameLabel')} hint={t('nameHint')}>
        <Input
          id="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          className="h-11"
          data-testid="setup-name"
          autoFocus
        />
      </Field>
      <Field id="city" label={t('cityLabel')}>
        <Input
          id="city"
          list="city-options"
          autoComplete="address-level2"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          maxLength={60}
          className="h-11"
        />
        <datalist id="city-options">
          {cities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      {needsPassword ? (
        <PasswordField
          id="new-password"
          label={t('choosePassword')}
          hint={t('passwordHint', { min: MIN_PASSWORD })}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
      ) : null}
      {!isOrganizer ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t('accountTypeLabel')}</legend>
          <AccountTypeCards value={type} onChange={setType} />
        </fieldset>
      ) : null}
      <FormError message={error} />
      <Button
        type="submit"
        className="h-11 w-full rounded-full"
        disabled={!ready || complete.isPending}
        data-testid="setup-submit"
      >
        {type === 'organizer' && !isOrganizer ? t('continueToOrganizer') : t('finishSignUp')}
      </Button>
      {!ready ? (
        <p className="text-center text-xs text-muted-foreground" aria-live="polite">
          {name.trim().length < 2 ? t('needName') : t('passwordHint', { min: MIN_PASSWORD })}
        </p>
      ) : null}
    </form>
  );
}
