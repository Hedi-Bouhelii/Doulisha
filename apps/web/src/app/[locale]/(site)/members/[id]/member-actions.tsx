'use client';

import { useMutation } from '@tanstack/react-query';
import { Ban } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { BlockDialog, ReportButton } from '@/components/doulisha/safety';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { useTRPC } from '@/trpc/client';

/** Report or block a member from their page, or unblock them (TRS-03). */
export function MemberActions({
  user,
  blocked,
}: {
  user: { id: string; name: string };
  blocked: boolean;
}) {
  const t = useTranslations('Safety');
  const trpc = useTRPC();
  const router = useRouter();
  const [blocking, setBlocking] = useState(false);
  const unblock = useMutation(trpc.safety.unblock.mutationOptions());
  return (
    <div className="flex flex-wrap items-center gap-2">
      {blocked ? (
        <Button
          variant="outline"
          disabled={unblock.isPending}
          onClick={() => unblock.mutate({ userId: user.id }, { onSuccess: () => router.refresh() })}
          data-testid="member-unblock"
        >
          {t('unblock')}
        </Button>
      ) : (
        <Button
          variant="ghost"
          className="min-h-11 text-muted-foreground"
          onClick={() => setBlocking(true)}
          data-testid="member-block"
        >
          <Ban aria-hidden="true" />
          {t('blockName', { name: user.name })}
        </Button>
      )}
      <ReportButton target={{ type: 'user', id: user.id }} />
      <BlockDialog
        user={user}
        open={blocking}
        onOpenChange={setBlocking}
        onDone={() => router.refresh()}
      />
    </div>
  );
}
