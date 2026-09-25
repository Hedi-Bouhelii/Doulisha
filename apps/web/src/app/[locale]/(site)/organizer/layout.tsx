import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { redirect } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/locale';
import { getSession } from '@/server/auth';

import { OrganizerNav } from './organizer-nav';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Organizer space (ORG-01, EVT, PRT). Members only; guests and visitors are
 * sent to sign in. Every procedure checks ownership again on the server.
 */
export default async function OrganizerLayout({
  children,
  params,
}: LayoutProps<'/[locale]/organizer'>) {
  const locale = await resolveLocale(params);
  const session = await getSession();
  if (!session || session.user.isAnonymous) {
    redirect({ href: '/sign-in?next=/organizer', locale });
  }
  const t = await getTranslations('Organizer');
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <p className="text-sm font-semibold text-primary print:hidden">{t('title')}</p>
      <OrganizerNav
        links={[
          { href: '/organizer', label: t('dashboard') },
          { href: '/organizer/events/new', label: t('createEvent') },
          { href: '/organizer/profile', label: t('profile') },
          { href: '/host', label: t('hostPrivate') },
        ]}
      />
      <div className="mt-6">{children}</div>
    </div>
  );
}
