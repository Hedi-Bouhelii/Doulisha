import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Booking bar (template "Get Ticket"): fixed to the bottom of the screen on
 * mobile, a regular block on large screens. Leaves room for the iOS home bar.
 */
export function StickyCTA({
  summary,
  action,
  className,
}: {
  summary: ReactNode;
  action: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur',
        'lg:static lg:rounded-xl lg:border lg:bg-card lg:p-4 lg:shadow-sm',
        className,
      )}
    >
      {/* A row on mobile; stacked in the desktop sidebar. */}
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 lg:flex-col lg:items-stretch lg:gap-3">
        <div className="min-w-0 text-sm">{summary}</div>
        <div className="shrink-0">{action}</div>
      </div>
    </div>
  );
}
