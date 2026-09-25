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
 * Empty and error states: friendly illustration, a clear title, a hint and
 * one next action (UX_GUIDELINES.md, "Required states").
 */
export function EmptyState({
  title,
  hint,
  action,
  tone = 'calm',
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  tone?: 'calm' | 'alert';
  className?: string;
}) {
  return (
    <div
      role={tone === 'alert' ? 'alert' : 'status'}
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/60 px-6 py-10 text-center',
        className,
      )}
    >
      <Illustration tone={tone} />
      <h2 className="font-sans text-lg font-semibold">{title}</h2>
      {hint ? <p className="max-w-sm text-sm text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
