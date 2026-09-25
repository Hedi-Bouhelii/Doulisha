'use client';

import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** Tabs of the organizer space; scrolls sideways on small screens. */
export function OrganizerNav({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const t = useTranslations('Organizer');
  return (
    <nav aria-label={t('title')} className="-mx-4 mt-2 overflow-x-auto px-4 print:hidden">
      <ul className="flex gap-1 border-b border-border">
        {links.map((link) => {
          const active =
            link.href === '/organizer' ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  '-mb-px flex min-h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap',
                  active
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
