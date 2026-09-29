'use client';

import { authClient } from '@doulisha/auth/client';
import { formatDate, type Locale } from '@doulisha/i18n';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, KeyRound, Loader2, Mail, Phone } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent, type ReactNode } from 'react';

import { FormError, PasswordField } from '@/components/auth/auth-parts';
import {
  ProviderLogo,
  socialErrorKey,
  type SocialProvider,
} from '@/components/auth/social-buttons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRouter } from '@/i18n/navigation';
import { useErrorMessage } from '@/lib/errors';
import { useTRPC } from '@/trpc/client';

const MIN_PASSWORD = 8;
const providerNames: Record<SocialProvider, string> = {
  google: 'Google',
  facebook: 'Facebook',
  apple: 'Apple',
};

interface ProviderRow {
  providerId: SocialProvider;
  linkedAt: Date | null;
  removable: boolean;
  canConnect: boolean;
}

function MethodRow({
  icon,
  label,
  value,
  action,
  testId,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  action?: ReactNode;
  testId: string;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 p-4" data-testid={testId}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        <div className="truncate text-sm text-muted-foreground">{value}</div>
      </div>
      {action}
    </li>
  );
}

/**
 * Every way into the account (ADR 0019): phone and email codes, the password,
 * and Google / Facebook, which can be connected or removed. The last way in
 * can never be removed.
 */
export function ConnectedAccounts({
  phone,
  email,
  hasPassword,
  providers,
  error,
  linked,
}: {
  phone: string | null;
  email: string | null;
  hasPassword: boolean;
  providers: ProviderRow[];
  /** `?error=` after a failed Google or Facebook link. */
  error?: string;
  /** `?linked=` after a successful link. */
  linked?: string;
}) {
  const t = useTranslations('Account');
  const tErrors = useTranslations('Errors');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const trpc = useTRPC();
  const errorMessage = useErrorMessage();
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<SocialProvider | null>(null);
  const unlink = useMutation(trpc.account.unlinkProvider.mutationOptions());

  const linkError = socialErrorKey(error);
  const justLinked = providers.find((p) => p.providerId === linked && p.linkedAt);

  async function connect(provider: SocialProvider) {
    setBusy(provider);
    setActionError(null);
    const { error: failure } = await authClient.linkSocial({
      provider,
      callbackURL: `/${locale}/account?linked=${provider}`,
      errorCallbackURL: `/${locale}/account`,
    });
    if (failure) {
      setBusy(null);
      setActionError(tErrors('socialFailed'));
    }
  }

  async function remove() {
    if (!removing) return;
    setActionError(null);
    try {
      await unlink.mutateAsync({ providerId: removing });
      setRemoving(null);
      router.replace('/account');
      router.refresh();
    } catch (e) {
      setRemoving(null);
      setActionError(errorMessage(e));
    }
  }

  return (
    <section aria-labelledby="sign-in-methods" className="mt-8" data-testid="connected-accounts">
      <h2 id="sign-in-methods" className="font-sans text-lg font-semibold">
        {t('signInMethods')}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('signInHint')}</p>

      {justLinked ? (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 rounded-xl bg-success/10 p-3 text-sm text-success"
          data-testid="account-linked"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          {t('linked', { provider: providerNames[justLinked.providerId] })}
        </p>
      ) : null}
      <div className="mt-4">
        <FormError message={actionError ?? (linkError ? tErrors(linkError) : null)} />
      </div>

      <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
        <MethodRow
          testId="method-phone"
          icon={<Phone className="size-5 text-primary" aria-hidden="true" />}
          label={t('phone')}
          value={
            phone ? (
              <span className="ltr-nums" dir="ltr">
                {phone}
              </span>
            ) : (
              t('notAdded')
            )
          }
        />
        <MethodRow
          testId="method-email"
          icon={<Mail className="size-5 text-primary" aria-hidden="true" />}
          label={t('email')}
          value={email ? <span dir="ltr">{email}</span> : t('notAdded')}
        />
        <PasswordRow hasPassword={hasPassword} />
        {providers.map((p) => (
          <MethodRow
            key={p.providerId}
            testId={`method-${p.providerId}`}
            icon={<ProviderLogo provider={p.providerId} />}
            label={providerNames[p.providerId]}
            value={
              p.linkedAt
                ? t('connectedSince', { date: formatDate(new Date(p.linkedAt), locale) })
                : t('notConnected')
            }
            action={
              p.linkedAt ? (
                <Button
                  variant="outline"
                  className="min-h-11 rounded-full"
                  disabled={!p.removable}
                  title={p.removable ? undefined : t('lastMethodHint')}
                  onClick={() => setRemoving(p.providerId)}
                  data-testid={`remove-${p.providerId}`}
                >
                  {t('remove')}
                </Button>
              ) : p.canConnect ? (
                <Button
                  variant="outline"
                  className="min-h-11 rounded-full"
                  disabled={busy !== null}
                  onClick={() => void connect(p.providerId)}
                  data-testid={`connect-${p.providerId}`}
                >
                  {busy === p.providerId ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : null}
                  {t('connect')}
                </Button>
              ) : null
            }
          />
        ))}
      </ul>
      {providers.some((p) => p.linkedAt && !p.removable) ? (
        <p className="mt-2 text-xs text-muted-foreground" data-testid="last-method-hint">
          {t('lastMethodHint')}
        </p>
      ) : null}

      <Dialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent>
          <DialogTitle>
            {t('removeTitle', { provider: removing ? providerNames[removing] : '' })}
          </DialogTitle>
          <DialogDescription>
            {t('removeHint', { provider: removing ? providerNames[removing] : '' })}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={() => setRemoving(null)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              className="min-h-11"
              disabled={unlink.isPending}
              onClick={() => void remove()}
              data-testid="confirm-remove"
            >
              {t('remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** The password, or a short form to add one (useful after a Google or Facebook sign-up). */
function PasswordRow({ hasPassword }: { hasPassword: boolean }) {
  const t = useTranslations('Account');
  const tAuth = useTranslations('Auth');
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const save = useMutation(trpc.account.setPassword.mutationOptions());

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await save.mutateAsync({ password });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <li className="p-4" data-testid="method-password">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <KeyRound className="size-5 text-primary" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t('password')}</p>
          <p className="text-sm text-muted-foreground">
            {hasPassword ? t('passwordSet') : t('passwordNotSet')}
          </p>
        </div>
        {!hasPassword && !open ? (
          <Button
            variant="outline"
            className="min-h-11 rounded-full"
            onClick={() => setOpen(true)}
            data-testid="add-password"
          >
            {t('addPassword')}
          </Button>
        ) : null}
      </div>
      {open ? (
        <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3" noValidate>
          <PasswordField
            id="account-password"
            label={tAuth('choosePassword')}
            hint={tAuth('passwordHint', { min: MIN_PASSWORD })}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <FormError message={error} />
          <div className="flex gap-2">
            <Button
              type="submit"
              className="min-h-11 rounded-full"
              disabled={save.isPending || password.length < MIN_PASSWORD}
              data-testid="save-password"
            >
              {t('savePassword')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => setOpen(false)}
            >
              {t('cancel')}
            </Button>
          </div>
        </form>
      ) : null}
    </li>
  );
}
