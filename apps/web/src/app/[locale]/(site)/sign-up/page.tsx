import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AuthCard } from '@/components/auth/auth-parts';
import { resolveLocale } from '@/i18n/locale';
import { Link, redirect } from '@/i18n/navigation';
import { safeNext } from '@/lib/safe-next';
import { getSession } from '@/server/auth';

import { SignUpForm } from './sign-up-form';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/sign-up'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'Auth' });
  return { title: t('createAccount'), robots: { index: false } };
}

/** ACC-01 sign-up (ADR 0016). `?type=organizer` preselects the organizer path. */
export default async function SignUpPage({ params, searchParams }: PageProps<'/[locale]/sign-up'>) {
  const locale = await resolveLocale(params);
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const session = await getSession();
  if (session && !session.user.isAnonymous) redirect({ href: next, locale });
  const t = await getTranslations('Auth');

  return (
    <AuthCard
      title={t('signUpTitle')}
      subtitle={t('signUpSubtitle')}
      footer={
        <>
          {t('haveAccount')}{' '}
          <Link
            href={next === '/' ? '/sign-in' : `/sign-in?next=${encodeURIComponent(next)}`}
            className="font-semibold text-primary hover:underline"
          >
            {t('signIn')}
          </Link>
        </>
      }
    >
      <SignUpForm
        next={next}
        initialType={sp.type === 'organizer' ? 'organizer' : 'participant'}
        showDevOutbox={process.env.NODE_ENV !== 'production'}
      />
    </AuthCard>
  );
}
