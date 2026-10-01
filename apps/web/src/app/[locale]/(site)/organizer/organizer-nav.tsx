'use client';

import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** Tabs of the organizer space (green underline on the current one); scrolls sideways on phones. */
export function OrganizerNav({
  links,
}: {
  links: { href: string; label: string; badge?: number }[];
}) {
  const pathname = usePathname();
  const t = useTranslations('Organizer');
  return (
    <nav aria-label={t('title')} className="no-scrollbar -mx-4 overflow-x-auto px-4 print:hidden">
      <ul className="flex gap-1">
        {links.map((link) => {
          const active =
            link.href === '/organizer' ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-12 items-center gap-2 px-3 text-sm font-medium whitespace-nowrap transition-colors',
                  'after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors',
                  active
                    ? 'text-primary after:bg-primary'
                    : 'text-muted-foreground after:bg-transparent hover:text-foreground',
                )}
              >
                {link.label}
                {link.badge ? (
                  <span
                    className="ltr-nums inline-flex min-w-5 items-center justify-center rounded-full bg-highlight px-1.5 text-xs leading-5 font-semibold text-highlight-foreground"
                    data-testid="payments-badge"
                  >
                    {link.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
