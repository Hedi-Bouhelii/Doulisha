'use client';

import { phoneInputSchema } from '@doulisha/validators';
import { CalendarPlus, Eye, EyeOff, Mail, Phone, Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';

import { LogoMark } from '@/components/brand/logo';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type Method = 'phone' | 'email';
export type AccountType = 'participant' | 'organizer';

/** The card every auth screen sits in: logo, title, subtitle, content, footer. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <LogoMark className="mx-auto h-14" />
        <h1 className="mt-4 text-center text-3xl font-bold">{title}</h1>
        {subtitle ? (
          <p className="mt-2 text-center text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>
      {footer ? <div className="mt-5 text-center text-sm">{footer}</div> : null}
    </div>
  );
}

/** Phone or email, as a two-button switch (fewer taps than tabs on a phone). */
export function MethodSwitch({
  value,
  onChange,
}: {
  value: Method;
  onChange: (m: Method) => void;
}) {
  const t = useTranslations('Auth');
  return (
    <div
      role="radiogroup"
      aria-label={t('methodLabel')}
      className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
    >
      {(['phone', 'email'] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={value === m}
          onClick={() => onChange(m)}
          data-testid={`method-${m}`}
          className={cn(
            'flex min-h-10 items-center justify-center gap-2 rounded-full text-sm font-medium transition',
            value === m
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {m === 'phone' ? (
            <Phone className="size-4" aria-hidden="true" />
          ) : (
            <Mail className="size-4" aria-hidden="true" />
          )}
          {t(m === 'phone' ? 'phoneTab' : 'emailTab')}
        </button>
      ))}
    </div>
  );
}

/** Phone number or email address, depending on the method. */
export function IdentifierField({
  method,
  value,
  onChange,
}: {
  method: Method;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations('Auth');
  return method === 'phone' ? (
    <div className="space-y-1.5">
      <Label htmlFor="phone">{t('phoneLabel')}</Label>
      <Input
        id="phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        dir="ltr"
        placeholder="20 123 456"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 text-start"
        aria-describedby="phone-hint"
      />
      <p id="phone-hint" className="text-xs text-muted-foreground">
        {t('phoneHint')}
      </p>
    </div>
  ) : (
    <div className="space-y-1.5">
      <Label htmlFor="email">{t('emailLabel')}</Label>
      <Input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        dir="ltr"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 text-start"
      />
    </div>
  );
}

/** Normalizes the identifier: E.164 phone or trimmed email; null when invalid. */
export function parseIdentifier(method: Method, value: string): string | null {
  if (method === 'phone') {
    const parsed = phoneInputSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }
  const parsed = z.email().safeParse(value.trim().toLowerCase());
  return parsed.success ? parsed.data : null;
}

/** Password with a show / hide toggle. */
export function PasswordField({
  id = 'password',
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  hint?: string;
}) {
  const t = useTranslations('Auth');
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 pe-12 text-start"
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('hidePassword') : t('showPassword')}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** The 6-digit code, always left to right. */
export function CodeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations('Auth');
  return (
    <div className="space-y-2">
      <Label htmlFor="otp">{t('codeLabel')}</Label>
      <div dir="ltr" className="flex justify-center">
        <InputOTP
          id="otp"
          maxLength={6}
          value={value}
          onChange={onChange}
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
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-highlight-soft p-3 text-sm text-highlight">
      {message}
    </p>
  );
}

/** Development only: where mock codes appear. */
export function DevOutboxNote({ show }: { show: boolean }) {
  const t = useTranslations('Auth');
  if (!show) return null;
  return (
    <p className="mt-6 rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
      {t('devOutbox')}{' '}
      <Link href="/dev/outbox" className="font-medium text-primary underline" target="_blank">
        {t('openOutbox')}
      </Link>
    </p>
  );
}

/**
 * Maps Better Auth failures to our translated error keys (ADR 0016).
 * Better Auth returns codes such as INVALID_OTP or INVALID_EMAIL_OR_PASSWORD.
 */
export function authErrorKey(error: { status?: number; code?: string } | null | undefined) {
  const code = error?.code ?? '';
  if (!error) return 'generic' as const;
  if (error.status === 429) return 'tooManyRequests' as const;
  if (code.includes('CREDENTIAL_ACCOUNT_NOT_FOUND')) return 'noPasswordYet' as const;
  if (code.includes('OR_PASSWORD') || code.includes('INVALID_PASSWORD'))
    return 'invalidCredentials' as const;
  if (code.includes('PASSWORD_TOO_SHORT')) return 'passwordTooShort' as const;
  if (code.includes('OTP') || code.includes('CODE')) return 'invalidCode' as const;
  if (code.includes('PHONE')) return 'invalidPhone' as const;
  if (code.includes('EMAIL')) return 'invalidEmail' as const;
  return 'generic' as const;
}

/** "I want to join events" / "I organize events" (ACC-05: the same account can do both later). */
export function AccountTypeCards({
  value,
  onChange,
}: {
  value: AccountType;
  onChange: (type: AccountType) => void;
}) {
  const t = useTranslations('Auth');
  const options = [
    {
      type: 'participant' as const,
      icon: Ticket,
      title: t('typeParticipant'),
      hint: t('typeParticipantHint'),
    },
    {
      type: 'organizer' as const,
      icon: CalendarPlus,
      title: t('typeOrganizer'),
      hint: t('typeOrganizerHint'),
    },
  ];
  return (
    <div role="radiogroup" className="grid grid-cols-2 gap-2">
      {options.map(({ type, icon: Icon, title, hint }) => (
        <button
          key={type}
          type="button"
          role="radio"
          aria-checked={value === type}
          onClick={() => onChange(type)}
          data-testid={`account-type-${type}`}
          className={cn(
            'flex flex-col items-start gap-1.5 rounded-xl border p-3 text-start transition',
            value === type
              ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
              : 'border-border hover:bg-accent',
          )}
        >
          <Icon
            className={cn('size-5', value === type ? 'text-primary' : 'text-muted-foreground')}
            aria-hidden="true"
          />
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </button>
      ))}
    </div>
  );
}
