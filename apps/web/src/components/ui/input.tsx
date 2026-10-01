import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared look of every text control (inputs, text areas, selects): warm
 * surface, 44 px tall, rounded, and a soft green focus ring.
 */
export const fieldControlClass = cn(
  'w-full min-w-0 rounded-xl border border-input bg-card text-base shadow-xs outline-none transition-[color,background-color,border-color,box-shadow] duration-150 md:text-sm',
  'placeholder:text-muted-foreground/75 hover:border-primary/35',
  'focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/15',
  'aria-invalid:border-destructive aria-invalid:ring-destructive/15',
  'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
  'dark:bg-input/20',
);

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldControlClass,
        'h-11 px-3.5 py-1 selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
