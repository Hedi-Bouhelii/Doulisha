import { BadgeCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { resolveLocale } from '@/i18n/locale';
import { api } from '@/trpc/server';

import { ProfileForm } from './profile-form';

/** ACC-03: the organizer profile that sells tickets and appears on event pages. */
export default async function OrganizerProfilePage({
  params,
}: PageProps<'/[locale]/organizer/profile'>) {
  await resolveLocale(params);
  const t = await getTranslations('Organizer');
  const tEvent = await getTranslations('Event');
  const [profile] = await (await api()).organizer.profiles();

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold">{profile ? t('profile') : t('becomeTitle')}</h1>
      {profile ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <BadgeCheck className="size-4" aria-hidden="true" />
          {profile.verifiedAt ? tEvent('verified') : t('unverified')}
        </p>
      ) : (
        <p className="mt-2 text-muted-foreground">{t('becomeHint')}</p>
      )}
      <ProfileForm
        profile={
          profile
            ? {
                id: profile.id,
                name: profile.name,
                bio: profile.bio,
                legalStatus: profile.legalStatus,
                regions: profile.regions,
              }
            : null
        }
      />
    </div>
  );
}
