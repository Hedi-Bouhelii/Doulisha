import { MoreHorizontal } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { accentOf, CategoryIcon } from './category-icon';

/** Large category button on the home page (template: Trips, Sports, Parties…). */
export function CategoryTile({
  href,
  label,
  icon,
  accent,
}: {
  href: string;
  label: string;
  icon?: string;
  accent?: string;
}) {
  const colors = accent ? accentOf(accent) : null;
  return (
    <Link
      href={href}
      className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 text-center text-sm font-medium shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <span
        className={cn(
          'flex size-11 items-center justify-center rounded-full',
          colors ? colors.tile : 'bg-muted text-foreground',
        )}
      >
        {icon ? (
          <CategoryIcon name={icon} className="size-5" />
        ) : (
          <MoreHorizontal aria-hidden="true" className="size-5" />
        )}
      </span>
      <span className="line-clamp-2">{label}</span>
    </Link>
  );
}
