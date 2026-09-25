import { Search } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

import { LocaleSwitcher } from './locale-switcher';
import { MobileNav } from './mobile-nav';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

/** Top bar from the template: logo, main links, search, language, theme, account. */
export async function SiteHeader() {
  const t = await getTranslations('Nav');
  const session = await getSession();
  const me = session ? await (await api()).me.get() : null;
  const user =
    me && !me.isAnonymous
      ? { name: me.name, image: me.image, isAdmin: me.roles.includes('admin') }
      : null;

  const links = [
    { href: '/', label: t('home') },
    { href: '/explore', label: t('explore') },
    // Visitors have no tickets; guests who booked on this device do.
    ...(me ? [{ href: '/tickets', label: t('myTickets') }] : []),
  ];
  // Member spaces: in the account menu on large screens, in the menu sheet on phones.
  const spaces = user
    ? [
        { href: '/organizer', label: t('organizer') },
        { href: '/host', label: t('host') },
        ...(user.isAdmin ? [{ href: '/admin', label: t('admin') }] : []),
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 print:hidden border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <MobileNav
          links={[...links, ...spaces, ...(me ? [] : [{ href: '/sign-in', label: t('signIn') }])]}
        />
        <Link href="/" className="me-auto rounded-lg md:me-6" aria-label="Doulisha">
          <Logo />
        </Link>
        <nav aria-label={t('mainNavigation')} className="me-auto hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Button asChild variant="ghost" size="icon" className="hidden size-11 sm:inline-flex">
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
