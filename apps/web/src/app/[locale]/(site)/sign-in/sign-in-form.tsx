'use client';

import { authClient } from '@doulisha/auth/client';
import { phoneInputSchema } from '@doulisha/validators';
import { Mail, Phone } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link, useRouter } from '@/i18n/navigation';

export type SocialProvider = 'google' | 'facebook' | 'apple';

type Step = 'phone' | 'code' | 'name';

/** Maps Better Auth failures to our translated messages. */
function errorKey(error: { status?: number; code?: string } | null | undefined) {
  if (!error) return 'generic' as const;
  if (error.status === 429) return 'tooManyRequests' as const;
  if (error.code?.includes('OTP') || error.code?.includes('CODE')) return 'invalidCode' as const;
  if (error.code?.includes('PHONE')) return 'invalidPhone' as const;
  return 'generic' as const;
}

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

  const [step, setStep] = useState<Step>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const callbackURL = `/${locale}${next === '/' ? '' : next}`;

  function finish() {
    router.push(next);
    router.refresh();
  }

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    const parsed = phoneInputSchema.safeParse(phoneInput);
    if (!parsed.success) return setError(tErrors('invalidPhone'));
    setBusy(true);
    const { error: failure } = await authClient.phoneNumber.sendOtp({ phoneNumber: parsed.data });
    setBusy(false);
    if (failure) return setError(tErrors(errorKey(failure)));
    setPhone(parsed.data);
    setCode('');
    setStep('code');
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const { data, error: failure } = await authClient.phoneNumber.verify({
      phoneNumber: phone,
      code,
    });
    setBusy(false);
    if (failure || !data) return setError(tErrors(errorKey(failure)));
    // New phone accounts are created with the number as a temporary name.
    if (data.user.name === phone) return setStep('name');
    finish();
  }

  async function saveName(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    setBusy(true);
    await authClient.updateUser({ name: trimmed });
    setBusy(false);
    finish();
  }

  async function sendLink(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = z.email().safeParse(email.trim());
    if (!parsed.success) return setError(tErrors('invalidEmail'));
    setBusy(true);
    const { error: failure } = await authClient.signIn.magicLink({
      email: parsed.data,
      // New accounts start with the part before "@" as their name; editable later.
      name: parsed.data.split('@')[0],
      callbackURL,
    });
    setBusy(false);
    if (failure) return setError(tErrors(errorKey(failure)));
    setLinkSentTo(parsed.data);
  }

  async function social(provider: SocialProvider) {
    setBusy(true);
    await authClient.signIn.social({ provider, callbackURL });
  }

  return (
    <div className="mt-6">
      <Tabs defaultValue="phone">
        <TabsList className="grid h-11 w-full grid-cols-2">
          <TabsTrigger value="phone" className="gap-2">
            <Phone className="size-4" aria-hidden="true" />
            {t('phoneTab')}
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="size-4" aria-hidden="true" />
            {t('emailTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="phone" className="mt-5">
          {step === 'phone' ? (
            <form onSubmit={(e) => void sendCode(e)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('phoneLabel')}</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  placeholder="20 123 456"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="h-11 text-start"
                  aria-describedby="phone-hint"
                  required
                />
                <p id="phone-hint" className="text-xs text-muted-foreground">
                  {t('phoneHint')}
                </p>
              </div>
              <Button type="submit" className="h-11 w-full" disabled={busy}>
                {t('sendCode')}
              </Button>
            </form>
          ) : null}

          {step === 'code' ? (
            <form onSubmit={(e) => void verify(e)} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {/* LRI…PDI keeps "+216…" in order inside Arabic text. */}
                {t('codeSentTo', { phone: `\u2066${phone}\u2069` })}
              </p>
              <div className="space-y-2">
                <Label htmlFor="otp">{t('codeLabel')}</Label>
                <div dir="ltr" className="flex justify-center">
                  <InputOTP
                    id="otp"
                    maxLength={6}
                    value={code}
                    onChange={setCode}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }, (_, i) => (
                        <InputOTPSlot key={i} index={i} className="size-11 text-lg" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <Button type="submit" className="h-11 w-full" disabled={busy || code.length < 6}>
                {t('verify')}
              </Button>
              <div className="flex justify-between gap-2 text-sm">
                <button
                  type="button"
                  className="min-h-11 text-primary hover:underline"
                  onClick={() => setStep('phone')}
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

          {step === 'name' ? (
            <form onSubmit={(e) => void saveName(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('nameLabel')}</Label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                  aria-describedby="name-hint"
                  autoFocus
                  required
                  minLength={2}
                  maxLength={80}
                />
                <p id="name-hint" className="text-xs text-muted-foreground">
                  {t('nameHint')}
                </p>
              </div>
              <Button
                type="submit"
                className="h-11 w-full"
                disabled={busy || name.trim().length < 2}
              >
                {t('saveName')}
              </Button>
            </form>
          ) : null}
        </TabsContent>

        <TabsContent value="email" className="mt-5">
          {linkSentTo ? (
            <p role="status" className="rounded-lg bg-muted p-4 text-sm">
              {t('linkSent', { email: linkSentTo })}
            </p>
          ) : (
            <form onSubmit={(e) => void sendLink(e)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">{t('emailLabel')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 text-start"
                  required
                />
              </div>
              <Button type="submit" className="h-11 w-full" disabled={busy}>
                {t('sendLink')}
              </Button>
            </form>
          )}
        </TabsContent>
      </Tabs>

      {error ? (
        <p role="alert" className="mt-4 rounded-lg bg-highlight-soft p-3 text-sm text-highlight">
          {error}
        </p>
      ) : null}

      {socialProviders.length > 0 ? (
        <div className="mt-6 space-y-3">
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

      {showDevOutbox ? (
        <p className="mt-6 rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          {t('devOutbox')}{' '}
          <Link href="/dev/outbox" className="font-medium text-primary underline" target="_blank">
            {t('openOutbox')}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
