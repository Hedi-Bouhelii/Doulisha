import Image from 'next/image';

import { cn } from '@/lib/utils';

import logoImage from '../../../public/images/brand/logo.png';
import symbolImage from '../../../public/images/brand/symbol.png';

/** The Doulisha symbol: terracotta sun behind green mountains (brand file, 2026-09-25). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src={symbolImage}
      alt=""
      priority
      sizes="64px"
      className={cn('h-9 w-auto shrink-0', className)}
    />
  );
}

/**
 * Full logo: symbol, the Arabic wordmark "دوليشة" and "DOULISHA".
 * `tone="light"` is for dark backgrounds (footer): the logo file's dark text
 * would not be readable there, so the wordmark is set in cream text instead.
 */
export function Logo({
  tone = 'default',
  className,
}: {
  tone?: 'default' | 'light';
  className?: string;
}) {
  if (tone === 'default') {
    return (
      <Image
        src={logoImage}
        alt="Doulisha"
        priority
        sizes="160px"
        className={cn('h-11 w-auto', className)}
      />
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {/* Cream badge: the green mountains would vanish on the green footer. */}
      <span className="rounded-xl bg-background px-2 py-1.5">
        <LogoMark className="h-7" />
      </span>
      <span className="flex flex-col leading-none">
        <span lang="ar" className="font-display text-2xl font-bold text-background">
          دوليشة
        </span>
        <span className="text-[0.6rem] font-semibold tracking-[0.3em] text-background/80">
          DOULISHA
        </span>
      </span>
    </span>
  );
}
