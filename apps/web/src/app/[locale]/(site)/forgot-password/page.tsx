import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AuthCard } from '@/components/auth/auth-parts';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';

import { ResetForm } from './reset-form';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/forgot-password'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'Auth' });
  return { title: t('forgotPassword'), robots: { index: false } };
}

export default async function ForgotPasswordPage({
  params,
}: PageProps<'/[locale]/forgot-password'>) {
  await resolveLocale(params);
  const t = await getTranslations('Auth');
  return (
    <AuthCard
      title={t('resetTitle')}
      subtitle={t('resetSubtitle')}
      footer={
        <Link href="/sign-in" className="font-semibold text-primary hover:underline">
          {t('backToSignIn')}
        </Link>
      }
    >
      <ResetForm showDevOutbox={process.env.NODE_ENV !== 'production'} />
    </AuthCard>
  );
}
