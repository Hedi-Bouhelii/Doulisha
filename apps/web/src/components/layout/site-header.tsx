import { Search } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { Logo, LogoMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

import { LocaleSwitcher } from './locale-switcher';
import { MobileNav } from './mobile-nav';
import { HeaderNav, type NavLink } from './nav-links';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

/**
 * Top bar (design system v2): logo, main links with the current page marked,
 * search, language, theme and the account menu. The same bar serves public,
 * member and organizer pages; each area adds its own navigation below it.
 */
export async function SiteHeader() {
  const t = await getTranslations('Nav');
  const session = await getSession();
  const me = session ? await (await api()).me.get() : null;
  const user =
    me && !me.isAnonymous
      ? { name: me.name, image: me.image, isAdmin: me.roles.includes('admin') }
      : null;

  // Unread chat messages (ADR 0021), for members and for guests in a private event's chat.
  const unread = me ? await (await api()).chat.unread() : 0;
  const links: NavLink[] = [
    { href: '/', label: t('home') },
    { href: '/explore', label: t('explore') },
    // Visitors have no tickets; guests who booked on this device do.
    ...(me ? [{ href: '/tickets', label: t('myTickets') }] : []),
    ...(me && !user ? [{ href: '/messages', label: t('messages'), badge: unread }] : []),
  ];
  // Member spaces: in the account menu on large screens, in the menu sheet on phones.
  const spaces: NavLink[] = user
    ? [
        { href: '/feed', label: t('feed') },
        { href: '/messages', label: t('messages'), badge: unread },
        { href: '/account', label: t('account') },
        { href: '/organizer', label: t('organizer') },
        { href: '/host', label: t('host') },
        ...(user.isAdmin ? [{ href: '/admin', label: t('admin') }] : []),
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-1.5 px-4 sm:h-[4.25rem] sm:gap-2 sm:px-6">
        <MobileNav links={links} spaces={spaces} signedOut={!me} />
        <Link href="/" className="me-auto shrink-0 rounded-xl lg:me-4" aria-label={t('logoLabel')}>
          {/* The symbol alone on the narrowest phones, so the bar never scrolls sideways. */}
          <LogoMark className="h-9 min-[360px]:hidden" />
          <Logo className="hidden h-9 min-[360px]:block sm:h-11" />
        </Link>
        <div className="me-auto hidden lg:block">
          <HeaderNav links={links} label={t('mainNavigation')} />
        </div>
        <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
          <Link href="/explore" aria-label={t('search')}>
            <Search className="size-5" />
          </Link>
        </Button>
        <Suspense>
          <LocaleSwitcher />
        </Suspense>
        <ThemeToggle className="hidden sm:inline-flex" />
        <UserMenu user={user} links={spaces} />
      </div>
    </header>
  );
}
