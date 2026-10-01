import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Slot } from 'radix-ui';

/**
 * Doulisha buttons (design system v2, docs/UX_GUIDELINES.md): pill-shaped,
 * 44 px tall by default (touch target), one hierarchy everywhere:
 * `default` forest green for the main action, `accent` terracotta for a warm
 * secondary highlight, `outline` / `secondary` / `soft` for the rest,
 * `destructive` for irreversible actions, `ghost` and `link` inside content.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-(--ease-standard) outline-none select-none focus-visible:ring-4 focus-visible:ring-ring/25 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:shadow-card',
        accent:
          'bg-highlight text-highlight-foreground shadow-xs hover:bg-highlight/90 hover:shadow-card',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/25',
        outline:
          'border border-input bg-card text-foreground shadow-xs hover:border-primary/40 hover:bg-primary-soft/50 dark:bg-card dark:hover:bg-primary-soft/40',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/75',
        soft: 'bg-primary-soft text-primary hover:bg-primary-soft/70',
        ghost: 'text-foreground/85 hover:bg-accent hover:text-foreground',
        link: 'rounded-md text-primary underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        default: 'h-11 px-5 has-[>svg]:px-4',
        xs: "h-7 gap-1 px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-9 gap-1.5 px-3.5 has-[>svg]:px-3',
        lg: 'h-12 px-7 text-base has-[>svg]:px-6',
        icon: 'size-11',
        'icon-xs': "size-7 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-9',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
