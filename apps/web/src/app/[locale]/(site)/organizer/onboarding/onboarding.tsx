'use client';

import { OrganizerProfileEditor } from '@/components/doulisha/organizer-profile-editor';
import { useRouter } from '@/i18n/navigation';
import type { RouterOutputs } from '@/trpc/types';

type Profile = NonNullable<RouterOutputs['organizer']['myProfile']>;

export function Onboarding({
  profile,
  categories,
  next,
}: {
  profile: Profile;
  categories: { slug: string; name: string }[];
  next: string;
}) {
  const router = useRouter();
  return (
    <OrganizerProfileEditor
      profile={profile}
      categories={categories}
      mode="onboarding"
      onDone={() => {
        router.push(next);
        router.refresh();
      }}
    />
  );
}
