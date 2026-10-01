'use client';

import { useMutation } from '@tanstack/react-query';
import { Check, Loader2, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Link, useRouter } from '@/i18n/navigation';
import { useErrorMessage } from '@/lib/errors';
import { useTRPC } from '@/trpc/client';

/**
 * SOC-01 "Follow" an organizer: their new events show in the feed. Visitors
 * are sent to sign in and come back.
 */
export function FollowButton({
  organizerProfileId,
  following,
  signedIn,
  returnPath,
  compact = false,
}: {
  organizerProfileId: string;
  following: boolean;
  signedIn: boolean;
  returnPath: string;
  compact?: boolean;
}) {
  const t = useTranslations('Follow');
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const follow = useMutation(trpc.organizers.follow.mutationOptions());
  const unfollow = useMutation(trpc.organizers.unfollow.mutationOptions());
  const busy = follow.isPending || unfollow.isPending;
  const size = compact ? 'px-3.5' : 'px-5';

  if (!signedIn) {
    return (
      <Button asChild className={size}>
        <Link href={`/sign-in?next=${encodeURIComponent(returnPath)}`} data-testid="follow">
          <Plus aria-hidden="true" />
          {t('follow')}
        </Link>
      </Button>
    );
  }

  function toggle() {
    setError(null);
    const mutation = following ? unfollow : follow;
    mutation.mutate(
      { organizerProfileId },
      { onSuccess: () => router.refresh(), onError: (e) => setError(errorMessage(e)) },
    );
  }

  return (
    <div>
      <Button
        variant={following ? 'outline' : 'default'}
        className={size}
        disabled={busy}
        aria-pressed={following}
        onClick={toggle}
        data-testid={following ? 'unfollow' : 'follow'}
      >
        {busy ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : following ? (
          <Check aria-hidden="true" />
        ) : (
          <Plus aria-hidden="true" />
        )}
        {following ? t('following') : t('follow')}
      </Button>
      {error ? (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
