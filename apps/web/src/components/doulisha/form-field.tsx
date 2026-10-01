import type { ComponentProps, ReactNode } from 'react';

import { fieldControlClass } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Label, control, hint and error, stacked (UX_GUIDELINES: labels above
 * fields). `required` adds a discreet mark; the control keeps its own
 * `required` / `aria-required` attribute for assistive technology.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required = false,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
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
    <select className={cn(fieldControlClass, 'h-11 px-3.5', className)} {...props}>
      {children}
    </select>
  );
}
