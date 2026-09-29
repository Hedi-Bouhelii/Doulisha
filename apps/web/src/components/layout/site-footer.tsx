import { getTranslations } from 'next-intl/server';

import { Logo } from '@/components/brand/logo';
import { Link } from '@/i18n/navigation';

/** Green band from the template, with the logo and the tagline. */
export async function SiteFooter() {
  const t = await getTranslations('Home');
  const tFooter = await getTranslations('Footer');
  return (
    <footer className="mt-16 bg-primary print:hidden text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <Logo tone="light" />
        <p className="font-display text-xl italic">{t('tagline')}</p>
        <div className="flex flex-col items-center gap-1 text-sm text-primary-foreground/70 sm:items-end">
          <nav aria-label={tFooter('legal')} className="flex gap-4">
            <Link
              href="/terms"
              className="inline-flex min-h-11 items-center hover:text-primary-foreground hover:underline"
            >
              {tFooter('terms')}
            </Link>
            <Link
              href="/privacy"
              className="inline-flex min-h-11 items-center hover:text-primary-foreground hover:underline"
            >
              {tFooter('privacy')}
            </Link>
          </nav>
          <p>
            © <span className="ltr-nums">{new Date().getFullYear()}</span> Doulisha
          </p>
        </div>
      </div>
    </footer>
  );
}
