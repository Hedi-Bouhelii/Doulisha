'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { useTRPC } from '@/trpc/client';

/** ACC-05: a participant becomes an organizer; the profile is prefilled, then completed. */
export function BecomeOrganizerButton({ icon }: { icon?: ReactNode }) {
  const t = useTranslations('OrganizerProfile');
  const trpc = useTRPC();
  const router = useRouter();
  const become = useMutation(trpc.account.becomeOrganizer.mutationOptions());
  return (
    <Button
      type="button"
      className="min-h-11 rounded-full"
      disabled={become.isPending}
      onClick={() =>
        void become.mutateAsync().then(() => {
          router.push('/organizer/onboarding');
          router.refresh();
        })
      }
      data-testid="become-organizer"
    >
      {icon}
      {t('becomeOrganizer')}
    </Button>
  );
}
