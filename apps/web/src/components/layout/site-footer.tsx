import { getTranslations } from 'next-intl/server';

import { Logo } from '@/components/brand/logo';

/** Green band from the template, with the logo and the tagline. */
export async function SiteFooter() {
  const t = await getTranslations('Home');
  return (
    <footer className="mt-16 bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <Logo tone="light" />
        <p className="font-display text-xl italic">{t('tagline')}</p>
        <p className="text-sm text-primary-foreground/70">
          © <span className="ltr-nums">{new Date().getFullYear()}</span> Doulisha
        </p>
      </div>
    </footer>
  );
}
