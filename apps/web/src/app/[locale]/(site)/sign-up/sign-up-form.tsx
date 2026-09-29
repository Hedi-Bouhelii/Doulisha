'use client';

import { authClient } from '@doulisha/auth/client';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

import {
  AccountTypeCards,
  type AccountType,
  authErrorKey,
  CodeField,
  DevOutboxNote,
  FormError,
  IdentifierField,
  MethodSwitch,
  parseIdentifier,
  type Method,
} from '@/components/auth/auth-parts';
import {
  SocialButtons,
  socialErrorKey,
  type SocialProvider,
} from '@/components/auth/social-buttons';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';

/**
 * ACC-01 sign-up (ADR 0016, ADR 0019): what you mainly do, then a phone or
 * email code, or Google / Facebook. The name, city and (for codes) password
 * come right after, on /account/setup.
 */
export function SignUpForm({
  next,
  initialType,
  socialProviders,
  socialError,
  showDevOutbox,
}: {
  next: string;
  initialType: AccountType;
  socialProviders: SocialProvider[];
  /** `?error=` from a failed Google or Facebook sign-up. */
  socialError?: string;
  showDevOutbox: boolean;
}) {
  const t = useTranslations('Auth');
  const tErrors = useTranslations('Errors');
  const router = useRouter();
  const locale = useLocale();
  const [type, setType] = useState<AccountType>(initialType);
  const [method, setMethod] = useState<Method>('phone');
  const [identifier, setIdentifier] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const socialKey = socialErrorKey(socialError);
  const [error, setError] = useState<string | null>(socialKey ? tErrors(socialKey) : null);
  const [busy, setBusy] = useState(false);

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
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!sentTo) return;
    setError(null);
    setBusy(true);
    const { error: failure } =
      method === 'phone'
        ? await authClient.phoneNumber.verify({ phoneNumber: sentTo, code })
        : await authClient.signIn.emailOtp({ email: sentTo, otp: code });
    setBusy(false);
    if (failure) return setError(tErrors(authErrorKey(failure)));
    const search = new URLSearchParams({ type, next });
    router.push(`/account/setup?${search.toString()}`);
    router.refresh();
  }

  /** Google or Facebook: new accounts go to setup with the chosen type (ADR 0019). */
  async function social(provider: SocialProvider) {
    setBusy(true);
    setError(null);
    const nextParam = encodeURIComponent(next);
    const { error: failure } = await authClient.signIn.social({
      provider,
      callbackURL: `/${locale}${next === '/' ? '' : next}`,
      newUserCallbackURL: `/${locale}/account/setup?welcome=1&type=${type}&next=${nextParam}`,
      errorCallbackURL: `/${locale}/sign-up?type=${type}&next=${nextParam}`,
    });
    if (failure) {
      setBusy(false);
      setError(tErrors('socialFailed'));
    }
  }

  if (sentTo) {
    return (
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
            onClick={() => setSentTo(null)}
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
        <DevOutboxNote show={showDevOutbox} />
      </form>
    );
  }

  return (
    <form onSubmit={(e) => void sendCode(e)} className="space-y-5" noValidate>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t('accountTypeLabel')}</legend>
        <AccountTypeCards value={type} onChange={setType} />
      </fieldset>
      <MethodSwitch
        value={method}
        onChange={(m) => {
          setMethod(m);
          setIdentifier('');
          setError(null);
        }}
      />
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
      <p className="text-center text-xs text-muted-foreground">{t('codeExplainer')}</p>
      <SocialButtons
        providers={socialProviders}
        disabled={busy}
        onSelect={(provider) => void social(provider)}
      />
      <DevOutboxNote show={showDevOutbox} />
    </form>
  );
}
