import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { CategoryIcon } from './category-icon';

/**
 * Horizontal filter chip (template "All · Trips · Sports…"). Renders a link so
 * filters work without JavaScript and are shareable.
 */
export function CategoryChip({
  href,
  label,
  icon,
  active = false,
}: {
  href: string;
  label: string;
  icon?: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-[background-color,border-color,color,box-shadow] duration-150',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-xs'
          : 'border-border/80 bg-card text-foreground hover:border-primary/35 hover:bg-primary-soft/50',
      )}
    >
      {icon ? <CategoryIcon name={icon} className="size-4" /> : null}
      {label}
    </Link>
  );
}
