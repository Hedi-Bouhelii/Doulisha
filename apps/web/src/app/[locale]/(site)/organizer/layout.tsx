import type { Metadata } from 'next';
import { UsersRound } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { redirect } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/locale';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

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
  const tPayments = await getTranslations('Payments');
  const toVerify = await (await api()).organizer.receiptsToVerify();
  return (
    <div className="flex flex-1 flex-col">
      {/* Organizer space band (founder mockup): label and tabs under the main header. */}
      <div className="border-b border-border/60 bg-secondary/35 print:hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="flex items-center gap-2 pt-4 text-sm font-semibold text-primary">
            <UsersRound className="size-4" aria-hidden="true" />
            {t('title')}
          </p>
          <OrganizerNav
            links={[
              { href: '/organizer', label: t('dashboard') },
              { href: '/organizer/payments', label: tPayments('title'), badge: toVerify },
              { href: '/organizer/events/new', label: t('createEvent') },
              { href: '/organizer/profile', label: t('profile') },
              { href: '/host', label: t('hostPrivate') },
            ]}
          />
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </div>
  );
}
