import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AuthCard } from '@/components/auth/auth-parts';
import { configuredSocialProviders, getServerEnv } from '@/env';
import { Link, redirect } from '@/i18n/navigation';
import { getSession } from '@/server/auth';

import { safeNext } from '@/lib/safe-next';

import { SignInForm, type SocialProvider } from './sign-in-form';
import { resolveLocale } from '@/i18n/locale';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/sign-in'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'Nav' });
  return { title: t('signIn'), robots: { index: false } };
}

export default async function SignInPage({ params, searchParams }: PageProps<'/[locale]/sign-in'>) {
  const locale = await resolveLocale(params);
  const next = safeNext((await searchParams).next);

  const session = await getSession();
  if (session && !session.user.isAnonymous) redirect({ href: next, locale });

  const t = await getTranslations('Auth');
  const social = configuredSocialProviders(getServerEnv());
  const providers = (Object.keys(social) as SocialProvider[]).filter((p) => social[p]);

  return (
    <AuthCard
      title={t('title')}
      subtitle={t('subtitle')}
      footer={
        <>
          {t('noAccount')}{' '}
          <Link
            href={next === '/' ? '/sign-up' : `/sign-up?next=${encodeURIComponent(next)}`}
            className="font-semibold text-primary hover:underline"
            data-testid="to-sign-up"
          >
            {t('createAccount')}
          </Link>
        </>
      }
    >
      <SignInForm
        next={next}
        socialProviders={providers}
        showDevOutbox={process.env.NODE_ENV !== 'production'}
      />
    </AuthCard>
  );
}
