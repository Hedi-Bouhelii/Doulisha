import { canRemoveProvider, type SocialProvider } from '@doulisha/api';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/doulisha/page';
import { getServerEnv, socialProviderList } from '@/env';
import { resolveLocale } from '@/i18n/locale';
import { redirect } from '@/i18n/navigation';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

import { ConnectedAccounts } from './connected-accounts';
import { BlockedList, PrivacySettings } from './privacy-settings';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'Account' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

/** "My account": the ways to sign in, with Google and Facebook to connect (ADR 0019). */
export default async function AccountPage({
  params,
  searchParams,
}: PageProps<'/[locale]/account'>) {
  const locale = await resolveLocale(params);
  const sp = await searchParams;
  const session = await getSession();
  if (!session || session.user.isAnonymous) {
    redirect({ href: `/sign-in?next=${encodeURIComponent('/account')}`, locale });
  }
  const caller = await api();
  const [methods, privacy, blocked] = await Promise.all([
    caller.account.signInMethods(),
    caller.account.privacy(),
    caller.safety.blocked(),
  ]);
  const configured = socialProviderList(getServerEnv());
  // Connected providers stay listed even if their keys were removed since.
  const providers = [
    ...new Set<SocialProvider>([...configured, ...methods.providers.map((p) => p.providerId)]),
  ].map((providerId) => {
    const linked = methods.providers.find((p) => p.providerId === providerId);
    return {
      providerId,
      linkedAt: linked?.linkedAt ?? null,
      removable: linked ? canRemoveProvider(methods, providerId) : false,
      canConnect: configured.includes(providerId),
    };
  });
  const t = await getTranslations('Account');

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
      <PageHeader title={t('title')} description={t('intro')} />
      <ConnectedAccounts
        phone={methods.phone}
        email={methods.email}
        hasPassword={methods.hasPassword}
        providers={providers}
        error={typeof sp.error === 'string' ? sp.error : undefined}
        linked={typeof sp.linked === 'string' ? sp.linked : undefined}
      />
      <PrivacySettings userId={session!.user.id} initial={privacy} />
      <BlockedList people={blocked} />
    </div>
  );
}
