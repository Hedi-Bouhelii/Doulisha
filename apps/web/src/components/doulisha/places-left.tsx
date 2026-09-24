import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

/**
 * "7 places left" / "Full". Turns terracotta when fewer than 20% of places
 * remain, to create urgency without shouting.
 */
export function PlacesLeft({
  capacity,
  left,
  className,
}: {
  capacity: number | null;
  left: number | null;
  className?: string;
}) {
  const t = useTranslations('Event');
  if (capacity === null || left === null) {
    return <span className={cn('text-muted-foreground', className)}>{t('unlimited')}</span>;
  }
  const urgent = left === 0 || left / capacity <= 0.2;
  return (
    <span
      className={cn('font-medium', urgent ? 'text-highlight' : 'text-muted-foreground', className)}
    >
      {t('placesLeft', { count: left })}
    </span>
  );
}
