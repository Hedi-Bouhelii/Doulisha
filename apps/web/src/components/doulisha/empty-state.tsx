import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** A small line illustration: sun over hills, in brand colours. */
function Illustration({ tone }: { tone: 'calm' | 'alert' }) {
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true" className="h-20 w-30">
      <circle
        cx="60"
        cy="38"
        r="20"
        className={tone === 'alert' ? 'fill-highlight-soft' : 'fill-secondary'}
      />
      <circle
        cx="60"
        cy="38"
        r="20"
        fill="none"
        strokeWidth="2"
        className={tone === 'alert' ? 'stroke-highlight' : 'stroke-highlight/60'}
      />
      <path
        d="M8 70 38 40l14 16 12-12 30 26Z"
        className="fill-primary/15 stroke-primary"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M4 70h112" className="stroke-border" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Empty and error states: an illustration (or an icon that says what is
 * missing), a clear title, a hint and the next action (UX_GUIDELINES.md,
 * "Required states"). Every text comes from the translations.
 */
export function EmptyState({
  title,
  hint,
  action,
  secondaryAction,
  icon: Icon,
  tone = 'calm',
  size = 'default',
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  /** Replaces the illustration with an icon in a soft circle. */
  icon?: LucideIcon;
  tone?: 'calm' | 'alert';
  /** `compact` for states inside cards and side panels. */
  size?: 'default' | 'compact';
  className?: string;
}) {
  return (
    <div
      role={tone === 'alert' ? 'alert' : 'status'}
      className={cn(
        'flex flex-col items-center gap-3 rounded-3xl border border-border/70 bg-card/70 text-center',
        size === 'compact' ? 'px-5 py-8' : 'px-6 py-12 sm:py-14',
        className,
      )}
    >
      {Icon ? (
        <span
          className={cn(
            'flex size-14 items-center justify-center rounded-full',
            tone === 'alert' ? 'bg-highlight-soft text-highlight' : 'bg-primary-soft text-primary',
          )}
        >
          <Icon className="size-6" aria-hidden="true" />
        </span>
      ) : (
        <Illustration tone={tone} />
      )}
      <h2 className="font-sans text-lg font-semibold text-balance">{title}</h2>
      {hint ? (
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
      {action || secondaryAction ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
