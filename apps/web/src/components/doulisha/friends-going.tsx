import { useTranslations } from 'next-intl';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/**
 * Overlapping avatars and a count (DSC-04). Only people who chose to show their
 * attendance are passed in; the count includes everyone going.
 */
export function FriendsGoing({
  people,
  count,
  className,
}: {
  people: { name: string; image: string | null }[];
  count: number;
  className?: string;
}) {
  const t = useTranslations('Event');
  const shown = people.slice(0, 5);
  const extra = count - shown.length;
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {shown.length > 0 ? (
        <div className="flex -space-x-2">
          {shown.map((p) => (
            <Avatar key={p.name} className="size-8 ring-2 ring-card" title={p.name}>
              {p.image ? <AvatarImage src={p.image} alt="" /> : null}
              <AvatarFallback className="bg-secondary text-xs font-semibold">
                {initials(p.name)}
              </AvatarFallback>
            </Avatar>
          ))}
          {extra > 0 ? (
            <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-muted px-1.5 text-[0.65rem] font-semibold ring-2 ring-card">
              <span className="ltr-nums">+{extra}</span>
            </span>
          ) : null}
        </div>
      ) : null}
      <span className="text-sm text-muted-foreground">{t('going', { count })}</span>
    </div>
  );
}
