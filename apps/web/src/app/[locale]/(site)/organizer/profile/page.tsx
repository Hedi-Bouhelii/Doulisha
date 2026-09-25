import { CalendarPlus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/doulisha/empty-state';
import { resolveLocale } from '@/i18n/locale';
import { api } from '@/trpc/server';

import { BecomeOrganizerButton } from './become-organizer-button';
import { ProfileTab } from './profile-tab';

/** ACC-03: the organizer profile as participants see it, with an edit mode. */
export default async function OrganizerProfilePage({
  params,
}: PageProps<'/[locale]/organizer/profile'>) {
  await resolveLocale(params);
  const t = await getTranslations('Organizer');
  const caller = await api();
  const [profile, categories] = await Promise.all([
    caller.organizer.myProfile(),
    caller.catalog.categories(),
  ]);

  if (!profile) {
    return (
      <EmptyState
        title={t('becomeTitle')}
        hint={t('becomeHint')}
        action={<BecomeOrganizerButton icon={<CalendarPlus aria-hidden="true" />} />}
      />
    );
  }
  return (
    <ProfileTab
      profile={profile}
      categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
    />
  );
}
