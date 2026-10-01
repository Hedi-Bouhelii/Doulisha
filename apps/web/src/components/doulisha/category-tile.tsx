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
      className="group flex min-h-28 flex-col items-center justify-center gap-2.5 rounded-2xl border border-border/70 bg-card p-3 text-center text-sm font-semibold shadow-card transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-raised"
    >
      <span
        className={cn(
          'flex size-12 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105',
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
