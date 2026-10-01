'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Filters of a results page: a sticky card beside the results on large
 * screens, and one button that opens it on phones. The filters stay a plain
 * form, so they work without JavaScript and give shareable URLs.
 */
export function FiltersPanel({
  title,
  activeCount,
  initiallyOpen,
  children,
}: {
  title: string;
  activeCount: number;
  initiallyOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <div className="lg:sticky lg:top-24" data-testid="explore-filters">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between lg:hidden"
        aria-expanded={open}
        aria-controls="filters-panel"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal aria-hidden="true" />
          {title}
        </span>
        {activeCount > 0 ? (
          <span className="ltr-nums rounded-full bg-primary px-2 text-xs leading-5 text-primary-foreground">
            {activeCount}
          </span>
        ) : null}
      </Button>
      <div
        id="filters-panel"
        className={cn(
          'mt-3 rounded-2xl border border-border/70 bg-card p-5 shadow-card lg:mt-0 lg:block',
          open ? 'block' : 'hidden',
        )}
      >
        <p className="mb-4 hidden items-center gap-2 text-sm font-semibold lg:flex">
          <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
          {title}
          {activeCount > 0 ? (
            <span className="ltr-nums ms-auto rounded-full bg-primary px-2 text-xs leading-5 text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </p>
        {children}
      </div>
    </div>
  );
}
