'use client';

import { phoneInputSchema } from '@doulisha/validators';
import {
  AlertCircle,
  CalendarPlus,
  Check,
  Eye,
  EyeOff,
  Mail,
  Phone,
  QrCode,
  ShieldCheck,
  Terminal,
  Ticket,
  Wallet,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';

import { LogoMark } from '@/components/brand/logo';
import { HillsBackdrop, LeafSprig } from '@/components/doulisha/decor';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type Method = 'phone' | 'email';
export type AccountType = 'participant' | 'organizer';

/**
 * The card every auth screen sits in: logo, title, subtitle, content, footer.
 * On large screens a brand panel (tagline and what Doulisha offers) sits
 * beside the form; phones get the form alone.
 */
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
  const tHome = useTranslations('Home');
  const promises = [
    { icon: ShieldCheck, text: tHome('trustSecure') },
    { icon: Wallet, text: tHome('trustPayments') },
    { icon: QrCode, text: tHome('trustTickets') },
  ];
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:py-12 lg:max-w-5xl lg:px-6">
      <div className="grid overflow-hidden rounded-3xl border border-border/70 bg-card shadow-raised lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="relative hidden flex-col overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
          <span className="w-fit rounded-2xl bg-background px-2.5 py-2">
            <LogoMark className="h-9" />
          </span>
          <p className="mt-10 font-display text-4xl leading-tight font-bold text-balance">
            {tHome('tagline')}
          </p>
          <p className="mt-4 max-w-xs leading-relaxed text-primary-foreground/80">
            {tHome('heroSubtitle')}
          </p>
          <ul className="relative z-10 mt-10 space-y-3 text-sm font-medium">
            {promises.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/12">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <LeafSprig className="absolute end-8 bottom-20 h-36 w-auto text-primary-foreground opacity-40" />
          <HillsBackdrop className="pointer-events-none absolute inset-x-0 bottom-0 mt-auto h-28" />
          <div className="min-h-24 flex-1" />
        </div>
        <div className="p-6 sm:p-10">
          <LogoMark className="mx-auto h-14 lg:hidden" />
          <h1 className="mt-4 text-center font-display text-3xl font-bold tracking-tight lg:mt-0 lg:text-start">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground lg:text-start">
              {subtitle}
            </p>
          ) : null}
          <div className="mt-7">{children}</div>
          {footer ? (
            <div className="mt-7 border-t border-border/70 pt-5 text-center text-sm">{footer}</div>
          ) : null}
        </div>
      </div>
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
      className="grid grid-cols-2 gap-1 rounded-full border border-border/60 bg-muted p-1"
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
            'flex min-h-10 items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none',
            value === m
              ? 'bg-card font-semibold text-foreground shadow-xs'
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
        className="text-start"
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
        className="text-start"
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
          className="pe-12 text-start"
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('hidePassword') : t('showPassword')}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
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
              <InputOTPSlot key={i} index={i} className="size-12 text-lg font-semibold" />
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
    <p
      role="alert"
      className="flex items-start gap-2 rounded-2xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

/** Development only: where mock codes appear. */
export function DevOutboxNote({ show }: { show: boolean }) {
  const t = useTranslations('Auth');
  if (!show) return null;
  return (
    <p className="mt-6 flex items-start gap-2 rounded-2xl border border-dashed border-border p-3 text-xs text-muted-foreground">
      <Terminal className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>
        {t('devOutbox')}{' '}
        <Link
          href="/dev/outbox"
          className="font-medium text-primary underline underline-offset-2"
          target="_blank"
        >
          {t('openOutbox')}
        </Link>
      </span>
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
    <div role="radiogroup" className="grid grid-cols-2 gap-3">
      {options.map(({ type, icon: Icon, title, hint }) => (
        <button
          key={type}
          type="button"
          role="radio"
          aria-checked={value === type}
          onClick={() => onChange(type)}
          data-testid={`account-type-${type}`}
          className={cn(
            'relative flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-start transition-[background-color,border-color,box-shadow] duration-150 focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none',
            value === type
              ? 'border-primary bg-primary-soft/50 ring-1 ring-primary/20'
              : 'border-border/80 hover:border-primary/35 hover:bg-primary-soft/25',
          )}
        >
          <span
            className={cn(
              'flex size-9 items-center justify-center rounded-xl transition-colors',
              value === type
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
          {value === type ? (
            <Check className="absolute end-3 top-3 size-4 text-primary" aria-hidden="true" />
          ) : null}
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs leading-snug text-muted-foreground">{hint}</span>
        </button>
      ))}
    </div>
  );
}
