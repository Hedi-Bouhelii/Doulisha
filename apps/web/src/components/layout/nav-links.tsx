'use client';

import {
  CalendarPlus,
  Compass,
  House,
  LayoutDashboard,
  LogIn,
  MessagesSquare,
  PartyPopper,
  Rss,
  Ticket,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { CountBadge } from './count-badge';

export interface NavLink {
  href: string;
  label: string;
  badge?: number;
}

/** One icon per destination, shared by the header, the phone menu and the account menu. */
export const navIcons: Record<string, LucideIcon> = {
  '/': House,
  '/explore': Compass,
  '/tickets': Ticket,
  '/feed': Rss,
  '/messages': MessagesSquare,
  '/account': UserRound,
  '/organizer': CalendarPlus,
  '/host': PartyPopper,
  '/admin': LayoutDashboard,
  '/sign-in': LogIn,
};

/** Whether `href` is the current page or one of its sub-pages. */
export function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

/** Main links of the header on large screens, with the current page marked. */
export function HeaderNav({ links, label }: { links: NavLink[]; label: string }) {
  const isActive = useIsActive();
  return (
    <nav aria-label={label} className="hidden items-center gap-1 lg:flex">
      {links.map((link) => {
        const active = isActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary-soft text-primary'
                : 'text-foreground/75 hover:bg-accent hover:text-foreground',
            )}
          >
            {link.label}
            <CountBadge count={link.badge} />
          </Link>
        );
      })}
    </nav>
  );
}

/** A link row of the phone menu (icon, label, unread count). */
export function MenuLink({ link, onNavigate }: { link: NavLink; onNavigate: () => void }) {
  const isActive = useIsActive();
  const active = isActive(link.href);
  const Icon = navIcons[link.href] ?? LayoutDashboard;
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-12 items-center gap-3 rounded-2xl px-3 font-medium transition-colors',
        active ? 'bg-primary-soft text-primary' : 'text-foreground hover:bg-accent',
      )}
    >
      <Icon
        className={cn('size-5', active ? 'text-primary' : 'text-muted-foreground')}
        aria-hidden="true"
      />
      {link.label}
      <CountBadge count={link.badge} />
    </Link>
  );
}
