'use client';

import { authClient } from '@doulisha/auth/client';
import { useTranslations } from 'next-intl';
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
import { useRouter } from '@/i18n/navigation';

const MIN_PASSWORD = 8;

/** New password with a code sent by SMS or email, then signed in (ADR 0016). */
export function ResetForm({ showDevOutbox }: { showDevOutbox: boolean }) {
  const t = useTranslations('Auth');
  const tErrors = useTranslations('Errors');
  const router = useRouter();
  const [method, setMethod] = useState<Method>('phone');
  const [identifier, setIdentifier] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    const value = parseIdentifier(method, identifier);
    if (!value) return setError(tErrors(method === 'phone' ? 'invalidPhone' : 'invalidEmail'));
    setBusy(true);
    const { error: failure } =
      method === 'phone'
        ? await authClient.phoneNumber.requestPasswordReset({ phoneNumber: value })
        : await authClient.emailOtp.sendVerificationOtp({ email: value, type: 'forget-password' });
    setBusy(false);
    if (failure) return setError(tErrors(authErrorKey(failure)));
    setSentTo(value);
  }

  async function reset(event: FormEvent) {
    event.preventDefault();
    if (!sentTo) return;
    setError(null);
    if (password.length < MIN_PASSWORD) return setError(tErrors('passwordTooShort'));
    setBusy(true);
    const { error: failure } =
      method === 'phone'
        ? await authClient.phoneNumber.resetPassword({
            phoneNumber: sentTo,
            otp: code,
            newPassword: password,
          })
        : await authClient.emailOtp.resetPassword({ email: sentTo, otp: code, password });
    if (failure) {
      setBusy(false);
      return setError(tErrors(authErrorKey(failure)));
    }
    const { error: signInFailure } =
      method === 'phone'
        ? await authClient.signIn.phoneNumber({ phoneNumber: sentTo, password })
        : await authClient.signIn.email({ email: sentTo, password });
    setBusy(false);
    if (signInFailure) return router.push('/sign-in');
    router.push('/');
    router.refresh();
  }

  if (sentTo) {
    return (
      <form onSubmit={(e) => void reset(e)} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('codeSentTo', { phone: `\u2066${sentTo}\u2069` })}
        </p>
        <CodeField value={code} onChange={setCode} />
        <PasswordField
          id="new-password"
          label={t('newPassword')}
          hint={t('passwordHint', { min: MIN_PASSWORD })}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <FormError message={error} />
        <Button
          type="submit"
          className="h-11 w-full rounded-full"
          disabled={busy || code.length < 6}
        >
          {t('savePassword')}
        </Button>
        <DevOutboxNote show={showDevOutbox} />
      </form>
    );
  }

  return (
    <form onSubmit={(e) => void sendCode(e)} className="space-y-4" noValidate>
      <MethodSwitch
        value={method}
        onChange={(m) => {
          setMethod(m);
          setIdentifier('');
        }}
      />
      <IdentifierField method={method} value={identifier} onChange={setIdentifier} />
      <FormError message={error} />
      <Button type="submit" className="h-11 w-full rounded-full" disabled={busy}>
        {t('sendCode')}
      </Button>
      <DevOutboxNote show={showDevOutbox} />
    </form>
  );
}
