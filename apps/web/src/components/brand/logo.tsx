import { cn } from '@/lib/utils';

/** The Doulisha mark: a terracotta sun rising behind green hills. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn('size-10 shrink-0', className)}>
      <circle cx="24" cy="21" r="15" fill="#C2622D" />
      <path d="M3 41 17 23l7 9 6-7 15 16Z" fill="#2D5A27" />
      <path d="m17 23 3.5 4.5-3.5 2-3-1.5Z" fill="#F5F0E8" opacity=".9" />
    </svg>
  );
}

/**
 * Mark plus the Arabic wordmark "دوليشة" and the Latin name, as in the template.
 * `tone="light"` is for dark backgrounds (footer).
 */
export function Logo({
  tone = 'default',
  className,
}: {
  tone?: 'default' | 'light';
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span
          lang="ar"
          className={cn(
            'font-display text-2xl font-bold',
            tone === 'light' ? 'text-background' : 'text-highlight',
          )}
        >
          دوليشة
        </span>
        <span
          className={cn(
            'text-[0.6rem] font-semibold tracking-[0.3em]',
            tone === 'light' ? 'text-background/80' : 'text-muted-foreground',
          )}
        >
          DOULISHA
        </span>
      </span>
    </span>
  );
}
