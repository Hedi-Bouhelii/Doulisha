import { ArrowLeft, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * Page building blocks of design system v2 (docs/UX_GUIDELINES.md): one
 * container width scale, one page header, one section heading, one back link.
 * Every text they show is passed in, already translated.
 */

const widths = {
  narrow: 'max-w-2xl',
  default: 'max-w-5xl',
  wide: 'max-w-7xl',
} as const;

/** Page width and gutters: 16 px on phones, 24 px from `sm`. */
export function Container({
  size = 'default',
  className,
  children,
}: {
  size?: keyof typeof widths;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('mx-auto w-full px-4 py-8 sm:px-6 sm:py-10', widths[size], className)}>
      {children}
    </div>
  );
}

/** "Back to …" link with an arrow that points the reading way. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft
        className="size-4 transition-transform group-hover:-translate-x-0.5 rtl:rotate-180 rtl:group-hover:translate-x-0.5"
        aria-hidden="true"
      />
      {children}
    </Link>
  );
}

/**
 * Page title block: optional eyebrow, the h1, a short description, and the
 * page's main actions on the reading-end side (below the title on phones).
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Small facts under the title (date, place, status). */
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-[0.14em] text-highlight uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
        {meta ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-sm text-muted-foreground">
            {meta}
          </div>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Heading of a page section, with an optional icon, description and action. */
export function SectionHeading({
  id,
  title,
  description,
  icon: Icon,
  action,
  level = 2,
  className,
}: {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  level?: 2 | 3;
  className?: string;
}) {
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <div className={cn('mb-4 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <Heading
          id={id}
          className={cn(
            'flex items-center gap-2 font-sans font-semibold tracking-tight',
            level === 2 ? 'text-xl' : 'text-base',
          )}
        >
          {Icon ? <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" /> : null}
          {title}
        </Heading>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** A key figure (organizer dashboard, event management). */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'primary',
  testId,
  className,
}: {
  icon: LucideIcon;
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'primary' | 'accent' | 'info' | 'warning';
  testId?: string;
  className?: string;
}) {
  const tones = {
    primary: 'bg-primary-soft text-primary',
    accent: 'bg-highlight-soft text-highlight',
    info: 'bg-info-soft text-info',
    warning: 'bg-warning-soft text-warning',
  } as const;
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card',
        className,
      )}
      data-testid={testId}
    >
      <span
        className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', tones[tone])}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="ltr-nums text-2xl leading-tight font-bold tracking-tight">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}
