'use client';

import { authClient } from '@doulisha/auth/client';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { initials } from '@/components/doulisha/friends-going';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, useRouter } from '@/i18n/navigation';

import { CountBadge } from './count-badge';
import { navIcons, type NavLink } from './nav-links';

export interface MenuUser {
  name: string;
  image: string | null;
  isAdmin: boolean;
}

/** Avatar menu for signed-in members; guests and visitors see "Sign in". */
export function UserMenu({ user, links = [] }: { user: MenuUser | null; links?: NavLink[] }) {
  const unread = links.reduce((sum, link) => sum + (link.badge ?? 0), 0);
  const t = useTranslations('Nav');
  const router = useRouter();

  if (!user) {
    return (
      <div className="flex items-center gap-1.5">
        <Button asChild variant="ghost" className="hidden sm:inline-flex">
          <Link href="/sign-in" data-testid="header-sign-in">
            {t('signIn')}
          </Link>
        </Button>
        <Button asChild className="px-4 sm:px-5">
          <Link href="/sign-up" data-testid="header-sign-up">
            <span className="sm:hidden">{t('signUpShort')}</span>
            <span className="hidden sm:inline">{t('signUp')}</span>
          </Link>
        </Button>
      </div>
    );
  }

  async function signOut() {
    await authClient.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t('account')}
          data-testid="user-menu"
        >
          <Avatar className="size-9 ring-2 ring-background shadow-xs">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          {unread > 0 ? (
            <span
              className="absolute end-1 top-1 size-3 rounded-full border-2 border-background bg-highlight"
              data-testid="unread-dot"
            />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuLabel className="flex items-center gap-3 py-2.5 text-sm font-semibold tracking-normal text-foreground normal-case">
          <Avatar className="size-9">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate" dir="auto">
            {user.name}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {links.map((link) => {
          const Icon = navIcons[link.href] ?? LayoutDashboard;
          return (
            <DropdownMenuItem key={link.href} asChild className="min-h-11">
              <Link href={link.href}>
                <Icon />
                {link.label}
                <CountBadge count={link.badge} testId={`menu-badge-${link.href.slice(1)}`} />
              </Link>
            </DropdownMenuItem>
          );
        })}
        {links.length > 0 ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem onSelect={() => void signOut()} className="min-h-11">
          <LogOut className="rtl:rotate-180" />
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
