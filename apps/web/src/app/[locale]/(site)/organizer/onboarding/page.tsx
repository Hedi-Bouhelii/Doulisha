import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/doulisha/page';
import { resolveLocale } from '@/i18n/locale';
import { redirect } from '@/i18n/navigation';
import { safeNext } from '@/lib/safe-next';
import { api } from '@/trpc/server';

import { Onboarding } from './onboarding';

/**
 * Organizer onboarding right after sign-up: who you are, what you organize,
 * how buyers pay you. The profile was already created and prefilled.
 */
export default async function OrganizerOnboardingPage({
  params,
  searchParams,
}: PageProps<'/[locale]/organizer/onboarding'>) {
  const locale = await resolveLocale(params);
  const next = safeNext((await searchParams).next);
  const caller = await api();
  const [profile, categories] = await Promise.all([
    caller.organizer.myProfile(),
    caller.catalog.categories(),
  ]);
  if (!profile) redirect({ href: '/organizer/profile', locale });
  const t = await getTranslations('OrganizerProfile');

  return (
    <div className="space-y-8">
      <PageHeader title={t('onboardingTitle')} description={t('onboardingHint')} />
      <Onboarding
        profile={profile!}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        next={next === '/' ? '/organizer' : next}
      />
    </div>
  );
}
