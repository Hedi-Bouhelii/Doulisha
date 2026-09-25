import type { ComponentProps, ReactNode } from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** Label, control and optional hint, stacked (UX_GUIDELINES: labels above fields). */
export function Field({
  id,
  label,
  hint,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The platform select, styled like our inputs: reliable on phones (native
 * picker) and in RTL, with the arrow on the reading-end side.
 */
export function NativeSelect({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-base shadow-xs outline-none md:text-sm dark:bg-input/30',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
