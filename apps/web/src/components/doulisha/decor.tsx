import { cn } from '@/lib/utils';

/**
 * Light brand decorations drawn inline (no image to download): a leaf sprig
 * and rolling hills under a sun, from the founder's mockups. Decorative only
 * (`aria-hidden`), used sparingly at the edges of a page.
 */

export function LeafSprig({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 96" aria-hidden="true" className={cn('text-primary', className)}>
      <path
        d="M32 94c0-26 2-52 10-80"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M36 60C20 58 10 46 8 32c14 2 26 12 28 28Z" fill="currentColor" fillOpacity="0.28" />
      <path d="M38 42c4-14 14-22 24-24-2 14-10 24-24 24Z" fill="currentColor" fillOpacity="0.2" />
      <path
        d="M34 78c-12-2-20-10-24-20 12 0 22 8 24 20Z"
        className="text-highlight"
        fill="currentColor"
        fillOpacity="0.3"
      />
    </svg>
  );
}

export function HillsBackdrop({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 120"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn('w-full', className)}
    >
      <circle cx="300" cy="46" r="26" className="fill-highlight/20" />
      <path d="M0 120V78c60-30 120-34 180-10s120 22 220-12v64Z" className="fill-primary/12" />
      <path d="M0 120V96c80-22 150-20 220-4s120 10 180-8v36Z" className="fill-highlight/15" />
    </svg>
  );
}
