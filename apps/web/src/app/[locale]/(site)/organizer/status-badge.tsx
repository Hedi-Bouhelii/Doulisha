import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

const tone: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  published: 'bg-cat-outdoor-bg text-cat-outdoor-fg',
  full: 'bg-cat-sports-bg text-cat-sports-fg',
  closed: 'bg-secondary text-secondary-foreground',
  ongoing: 'bg-cat-outdoor-bg text-cat-outdoor-fg',
  completed: 'bg-secondary text-secondary-foreground',
  cancelled: 'bg-highlight-soft text-highlight',
};

type Status = 'draft' | 'published' | 'full' | 'closed' | 'ongoing' | 'completed' | 'cancelled';

/** Event status as a small coloured pill. */
export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('Organizer.statusLabel');
  const known = status in tone;
  return (
    <span
      className={cn('rounded-full px-2 py-0.5 font-semibold', tone[status] ?? tone.draft)}
      data-testid="event-status"
    >
      {known ? t(status as Status) : status}
    </span>
  );
}
