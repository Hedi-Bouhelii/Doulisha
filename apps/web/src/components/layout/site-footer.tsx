import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { Logo } from '@/components/brand/logo';
import { Link } from '@/i18n/navigation';

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="inline-flex min-h-10 items-center text-sm text-primary-foreground/75 transition-colors hover:text-primary-foreground"
      >
        {children}
      </Link>
    </li>
  );
}

/**
 * Footer (design system v2): a soft wave into the forest-green band, the
 * brand column with the tagline, then links to discover, organize and the
 * legal pages.
 */
export async function SiteFooter() {
  const t = await getTranslations('Home');
  const tFooter = await getTranslations('Footer');
  const tNav = await getTranslations('Nav');
  return (
    <footer className="mt-20 print:hidden">
      <svg
        viewBox="0 0 1440 48"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="block h-8 w-full text-primary sm:h-12"
      >
        <path d="M0 48V20C240 0 480 0 720 16s480 28 720 4v28Z" fill="currentColor" />
      </svg>
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-8 pb-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Logo tone="light" />
            <p className="font-display text-xl italic">{t('tagline')}</p>
            <p className="max-w-xs text-sm leading-relaxed text-primary-foreground/75">
              {tFooter('about')}
            </p>
          </div>
          <nav aria-labelledby="footer-discover">
            <h2 id="footer-discover" className="mb-2 font-sans text-sm font-semibold">
              {tFooter('discover')}
            </h2>
            <ul>
              <FooterLink href="/explore">{tNav('explore')}</FooterLink>
              <FooterLink href="/tickets">{tNav('myTickets')}</FooterLink>
            </ul>
          </nav>
          <nav aria-labelledby="footer-organize">
            <h2 id="footer-organize" className="mb-2 font-sans text-sm font-semibold">
              {tFooter('organize')}
            </h2>
            <ul>
              <FooterLink href="/organizer/events/new">{tNav('createEvent')}</FooterLink>
              <FooterLink href="/host/new">{tNav('host')}</FooterLink>
            </ul>
          </nav>
          <nav aria-labelledby="footer-legal">
            <h2 id="footer-legal" className="mb-2 font-sans text-sm font-semibold">
              {tFooter('legal')}
            </h2>
            <ul>
              <FooterLink href="/terms">{tFooter('terms')}</FooterLink>
              <FooterLink href="/privacy">{tFooter('privacy')}</FooterLink>
              <FooterLink href="/data-deletion">{tFooter('dataDeletion')}</FooterLink>
            </ul>
          </nav>
        </div>
        <div className="border-t border-primary-foreground/15">
          <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-primary-foreground/70 sm:px-6">
            {tFooter('copyright', { year: String(new Date().getFullYear()) })}
          </p>
        </div>
      </div>
    </footer>
  );
}
