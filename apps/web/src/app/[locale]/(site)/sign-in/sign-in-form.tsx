'use client';

import { authClient } from '@doulisha/auth/client';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

import {
  authErrorKey,
  CodeField,
  DevOutboxNote,
  FormError,
  IdentifierField,
  MethodSwitch,
  parseIdentifier,
  PasswordField,
  type Method,
} from '@/components/auth/auth-parts';
import { Button } from '@/components/ui/button';
import { Link, useRouter } from '@/i18n/navigation';
import { useTRPC } from '@/trpc/client';

export type SocialProvider = 'google' | 'facebook' | 'apple';

type Mode = 'password' | 'code' | 'verify';

/**
 * ACC-01 sign-in (ADR 0016): phone or email with a password; "use a code
 * instead" signs in without the password (and sets one up afterwards).
 */
export function SignInForm({
  next,
  socialProviders,
  showDevOutbox,
}: {
  next: string;
  socialProviders: SocialProvider[];
  showDevOutbox: boolean;
}) {
  const t = useTranslations('Auth');
  const tErrors = useTranslations('Errors');
  const locale = useLocale();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [method, setMethod] = useState<Method>('phone');
  const [mode, setMode] = useState<Mode>('password');
  const [identifier, setIdentifier] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const callbackURL = `/${locale}${next === '/' ? '' : next}`;

  /** After a code, accounts without a name or password finish setup first. */
  async function done(checkSetup: boolean) {
    let needsSetup = false;
    if (checkSetup) {
      const status = await queryClient
        .fetchQuery({ ...trpc.account.status.queryOptions(), staleTime: 0 })
        .catch(() => null);
      needsSetup = status?.needsSetup ?? false;
    }
    router.push(needsSetup ? `/account/setup?next=${encodeURIComponent(next)}` : next);
    router.refresh();
  }

  async function signInWithPassword(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const value = parseIdentifier(method, identifier);
    if (!value) return setError(tErrors(method === 'phone' ? 'invalidPhone' : 'invalidEmail'));
    if (!password) return setError(tErrors('invalidCredentials'));
    setBusy(true);
    const { error: failure } =
      method === 'phone'
        ? await authClient.signIn.phoneNumber({ phoneNumber: value, password })
        : await authClient.signIn.email({ email: value, password });
    setBusy(false);
    if (failure) return setError(tErrors(authErrorKey(failure)));
    await done(false);
  }

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    const value = parseIdentifier(method, identifier);
    if (!value) return setError(tErrors(method === 'phone' ? 'invalidPhone' : 'invalidEmail'));
    setBusy(true);
    const { error: failure } =
      method === 'phone'
        ? await authClient.phoneNumber.sendOtp({ phoneNumber: value })
        : await authClient.emailOtp.sendVerificationOtp({ email: value, type: 'sign-in' });
    setBusy(false);
    if (failure) return setError(tErrors(authErrorKey(failure)));
    setSentTo(value);
    setCode('');
    setMode('verify');
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const { error: failure } =
      method === 'phone'
        ? await authClient.phoneNumber.verify({ phoneNumber: sentTo, code })
        : await authClient.signIn.emailOtp({ email: sentTo, otp: code });
    setBusy(false);
    if (failure) return setError(tErrors(authErrorKey(failure)));
    // New or older accounts may still need a name or a password.
    await done(true);
  }

  async function social(provider: SocialProvider) {
    setBusy(true);
    await authClient.signIn.social({ provider, callbackURL });
  }

  return (
    <div className="space-y-5">
      {mode !== 'verify' ? (
        <MethodSwitch
          value={method}
          onChange={(m) => {
            setMethod(m);
            setIdentifier('');
            setError(null);
          }}
        />
      ) : null}

      {mode === 'password' ? (
        <form onSubmit={(e) => void signInWithPassword(e)} className="space-y-4" noValidate>
          <IdentifierField method={method} value={identifier} onChange={setIdentifier} />
          <PasswordField
            label={t('passwordLabel')}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="min-h-11 content-center text-sm font-medium text-primary hover:underline"
            >
              {t('forgotPassword')}
            </Link>
          </div>
          <FormError message={error} />
          <Button
            type="submit"
            className="h-11 w-full rounded-full"
            disabled={busy}
            data-testid="sign-in-submit"
          >
            {t('signIn')}
          </Button>
          <button
            type="button"
            onClick={() => {
              setMode('code');
              setError(null);
            }}
            className="min-h-11 w-full text-sm font-medium text-primary hover:underline"
            data-testid="use-code"
          >
            {t('useCodeInstead')}
          </button>
        </form>
      ) : null}

      {mode === 'code' ? (
        <form onSubmit={(e) => void sendCode(e)} className="space-y-4" noValidate>
          <IdentifierField method={method} value={identifier} onChange={setIdentifier} />
          <FormError message={error} />
          <Button
            type="submit"
            className="h-11 w-full rounded-full"
            disabled={busy}
            data-testid="send-code"
          >
            {t('sendCode')}
          </Button>
          <button
            type="button"
            onClick={() => setMode('password')}
            className="min-h-11 w-full text-sm font-medium text-primary hover:underline"
          >
            {t('usePasswordInstead')}
          </button>
        </form>
      ) : null}

      {mode === 'verify' ? (
        <form onSubmit={(e) => void verify(e)} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {/* LRI…PDI keeps "+216…" in order inside Arabic text. */}
            {t('codeSentTo', { phone: `\u2066${sentTo}\u2069` })}
          </p>
          <CodeField value={code} onChange={setCode} />
          <FormError message={error} />
          <Button
            type="submit"
            className="h-11 w-full rounded-full"
            disabled={busy || code.length < 6}
            data-testid="verify-code"
          >
            {t('verify')}
          </Button>
          <div className="flex justify-between gap-2 text-sm">
            <button
              type="button"
              className="min-h-11 text-primary hover:underline"
              onClick={() => setMode('code')}
            >
              {t('changeNumber')}
            </button>
            <button
              type="button"
              className="min-h-11 text-primary hover:underline"
              onClick={() => void sendCode()}
              disabled={busy}
            >
              {t('resend')}
            </button>
          </div>
        </form>
      ) : null}

      {socialProviders.length > 0 ? (
        <div className="space-y-3">
          <p className="text-center text-xs text-muted-foreground">{t('orContinueWith')}</p>
          {socialProviders.map((provider) => (
            <Button
              key={provider}
              variant="outline"
              className="h-11 w-full"
              disabled={busy}
              onClick={() => void social(provider)}
            >
              {t(provider)}
            </Button>
          ))}
        </div>
      ) : null}

      <DevOutboxNote show={showDevOutbox} />
    </div>
  );
}
