'use client';

import { Menu } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Link } from '@/i18n/navigation';

import { MenuLink, type NavLink } from './nav-links';
import { ThemeToggle } from './theme-toggle';

/**
 * Menu sheet for small screens, sliding in from the reading-start side:
 * main links, then the member's spaces, then theme; visitors get sign-in and
 * sign-up at the bottom.
 */
export function MobileNav({
  links,
  spaces,
  signedOut,
}: {
  links: NavLink[];
  spaces: NavLink[];
  signedOut: boolean;
}) {
  const t = useTranslations('Nav');
  const rtl = useLocale() === 'ar';
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t('openMenu')}>
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side={rtl ? 'right' : 'left'} className="w-[min(20rem,86vw)] gap-0 p-0">
        <SheetHeader className="border-b border-border/70 px-5 py-4">
          <SheetTitle>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <nav aria-label={t('mainNavigation')} className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <MenuLink link={link} onNavigate={close} />
              </li>
            ))}
          </ul>
          {spaces.length > 0 ? (
            <>
              <p className="mt-6 mb-2 px-3 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                {t('mySpace')}
              </p>
              <ul className="space-y-1">
                {spaces.map((link) => (
                  <li key={link.href}>
                    <MenuLink link={link} onNavigate={close} />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </nav>
        <div className="space-y-3 border-t border-border/70 px-5 py-4">
          <div className="flex items-center justify-between text-sm font-medium">
            {t('theme')}
            <ThemeToggle />
          </div>
          {signedOut ? (
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline">
                <Link href="/sign-in" onClick={close}>
                  {t('signIn')}
                </Link>
              </Button>
              <Button asChild>
                <Link href="/sign-up" onClick={close}>
                  {t('signUp')}
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
