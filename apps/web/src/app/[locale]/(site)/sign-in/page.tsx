import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LogoMark } from '@/components/brand/logo';
import { configuredSocialProviders, getServerEnv } from '@/env';
import { redirect } from '@/i18n/navigation';
import { getSession } from '@/server/auth';

import { SignInForm, type SocialProvider } from './sign-in-form';
import { resolveLocale } from '@/i18n/locale';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/sign-in'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'Nav' });
  return { title: t('signIn'), robots: { index: false } };
}

/** Only internal paths are accepted as a destination after sign-in. */
function safeNext(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
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
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <LogoMark className="mx-auto h-16" />
        <h1 className="mt-4 text-center text-3xl font-bold">{t('title')}</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">{t('subtitle')}</p>
        <SignInForm
          next={next}
          socialProviders={providers}
          showDevOutbox={process.env.NODE_ENV !== 'production'}
        />
      </div>
    </div>
  );
}
