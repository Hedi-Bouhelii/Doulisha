'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

export type SocialProvider = 'google' | 'facebook' | 'apple';

/**
 * Messages for the `?error=` code Better Auth adds when a Google or Facebook
 * round-trip fails (ADR 0019). Unknown codes get a generic message.
 */
export function socialErrorKey(code: string | undefined) {
  if (!code) return null;
  if (code === 'account_not_linked') return 'socialAccountExists' as const;
  if (code === 'account_already_linked_to_different_user') return 'socialLinkedElsewhere' as const;
  if (code === 'access_denied') return 'socialCancelled' as const;
  return 'socialFailed' as const;
}

/** Brand marks drawn inline: lucide has no brand icons. */
export function ProviderLogo({ provider }: { provider: SocialProvider }) {
  if (provider === 'google') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
        <path
          fill="#4285F4"
          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"
        />
        <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
        <path
          fill="#EA4335"
          d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"
        />
      </svg>
    );
  }
  if (provider === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
        <circle cx="12" cy="12" r="12" fill="#1877F2" />
        <path
          fill="#fff"
          d="M16.7 15.5l.5-3.5h-3.3V9.8c0-1 .5-1.9 2-1.9h1.5v-3s-1.4-.2-2.7-.2c-2.8 0-4.6 1.7-4.6 4.7V12H7v3.5h3.1V24h3.8v-8.5h2.8z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
      <path d="M16.4 12.7c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8s2.3-1.3 3.1-2.5c1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.6-4.1zM13.9 5.2c.7-.8 1.2-2 1-3.2-1 0-2.2.7-3 1.5-.6.7-1.2 1.9-1 3.1 1.1.1 2.3-.6 3-1.4z" />
    </svg>
  );
}

/** "Continue with Google / Facebook" buttons, shown only for configured providers. */
export function SocialButtons({
  providers,
  disabled,
  onSelect,
}: {
  providers: SocialProvider[];
  disabled: boolean;
  onSelect: (provider: SocialProvider) => void;
}) {
  const t = useTranslations('Auth');
  if (providers.length === 0) return null;
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        {t('orContinueWith')}
      </p>
      {providers.map((provider) => (
        <Button
          key={provider}
          type="button"
          variant="outline"
          className="w-full"
          disabled={disabled}
          onClick={() => onSelect(provider)}
          data-testid={`social-${provider}`}
        >
          <ProviderLogo provider={provider} />
          {t(provider)}
        </Button>
      ))}
    </div>
  );
}
