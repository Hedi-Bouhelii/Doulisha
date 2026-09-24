import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/doulisha/empty-state';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Link, redirect } from '@/i18n/navigation';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';
import { resolveLocale } from '@/i18n/locale';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * /admin back office (ADM). Admins only: visitors are sent to sign in, other
 * members see a clear "admins only" message. The API checks the role again.
 */
export default async function AdminLayout({ children, params }: LayoutProps<'/[locale]/admin'>) {
  const locale = await resolveLocale(params);
  const session = await getSession();
  if (!session || session.user.isAnonymous) {
    redirect({ href: '/sign-in?next=/admin', locale });
  }
  const me = await (await api()).me.get();
  const isAdmin = me?.roles.includes('admin') ?? false;
  const t = await getTranslations('Admin');
  const tStates = await getTranslations('States');

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        {isAdmin ? (
          children
        ) : (
          <div className="mx-auto w-full max-w-xl px-4 py-16">
            <EmptyState
              tone="alert"
              title={t('forbiddenTitle')}
              hint={t('forbiddenHint')}
              action={
                <Button asChild className="min-h-11">
                  <Link href="/">{tStates('backHome')}</Link>
                </Button>
              }
            />
          </div>
        )}
      </main>
    </>
  );
}
