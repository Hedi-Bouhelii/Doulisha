import type { Metadata } from 'next';

import { redirect } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/locale';
import { getSession } from '@/server/auth';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Private events a member hosts (INV-01). Members only; guests answer through /invite. */
export default async function HostLayout({ children, params }: LayoutProps<'/[locale]/host'>) {
  const locale = await resolveLocale(params);
  const session = await getSession();
  if (!session || session.user.isAnonymous) {
    redirect({ href: '/sign-in?next=/host', locale });
  }
  return <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">{children}</div>;
}
