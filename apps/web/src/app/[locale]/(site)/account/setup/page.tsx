import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AuthCard } from '@/components/auth/auth-parts';
import { resolveLocale } from '@/i18n/locale';
import { redirect } from '@/i18n/navigation';
import { safeNext } from '@/lib/safe-next';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

import { SetupForm } from './setup-form';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Last step of sign-up (ADR 0016): name, city, password, participant or
 * organizer. Also where older accounts without a password add one.
 */
export default async function AccountSetupPage({
  params,
  searchParams,
}: PageProps<'/[locale]/account/setup'>) {
  const locale = await resolveLocale(params);
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const session = await getSession();
  if (!session || session.user.isAnonymous) {
    redirect({ href: `/sign-in?next=${encodeURIComponent(next)}`, locale });
  }
  const caller = await api();
  const [status, cities] = await Promise.all([caller.account.status(), caller.catalog.cities()]);
  if (!status.needsSetup) redirect({ href: next, locale });
  const t = await getTranslations('Auth');

  return (
    <AuthCard title={t('setupTitle')} subtitle={t('setupSubtitle')}>
      <SetupForm
        next={next}
        initial={{ name: status.name, city: status.city ?? '' }}
        needsPassword={!status.hasPassword}
        isOrganizer={status.isOrganizer}
        initialType={sp.type === 'organizer' ? 'organizer' : 'participant'}
        cities={cities}
      />
    </AuthCard>
  );
}
