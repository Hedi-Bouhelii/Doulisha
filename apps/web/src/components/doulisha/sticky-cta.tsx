import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Booking panel (design system v2). Phones: a bar fixed to the bottom of the
 * screen, so booking is always one tap away (leaves room for the iOS home
 * bar). Large screens: a ticket-like card in the sidebar, with `details`
 * above a perforation and the action below it. One element for both, so the
 * booking button exists once on the page.
 */
export function StickyCTA({
  summary,
  details,
  action,
  className,
}: {
  summary: ReactNode;
  /** Extra facts shown in the desktop card only. */
  details?: ReactNode;
  action: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-overlay backdrop-blur-md',
        'lg:static lg:overflow-hidden lg:rounded-3xl lg:border lg:border-border/70 lg:bg-card lg:p-0 lg:shadow-raised lg:backdrop-blur-none',
        className,
      )}
    >
      {/* A row on phones; the ticket card on large screens. */}
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 lg:block">
        <div className="min-w-0 text-sm lg:px-6 lg:pt-6">{summary}</div>
        {details ? <div className="hidden lg:block lg:px-6 lg:pt-5">{details}</div> : null}
        <div aria-hidden="true" className="relative hidden h-8 lg:block">
          <span className="absolute top-1/2 -start-3 size-6 -translate-y-1/2 rounded-full border border-border/70 bg-background" />
          <span className="absolute top-1/2 -end-3 size-6 -translate-y-1/2 rounded-full border border-border/70 bg-background" />
          <span className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-border" />
        </div>
        <div className="shrink-0 lg:px-6 lg:pb-6">{action}</div>
      </div>
    </div>
  );
}
