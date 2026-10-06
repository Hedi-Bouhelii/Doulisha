import { cn } from '@/lib/utils';

/** Placeholder shaped like the content it stands for (warm, softly pulsing). */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('animate-pulse rounded-xl bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
