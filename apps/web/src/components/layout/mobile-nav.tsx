'use client';

import { Menu } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Link } from '@/i18n/navigation';

import { ThemeToggle } from './theme-toggle';

/** Menu sheet for small screens. It slides in from the reading-start side. */
export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const t = useTranslations('Nav');
  const rtl = useLocale() === 'ar';
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 md:hidden"
          aria-label={t('openMenu')}
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side={rtl ? 'right' : 'left'} className="w-72">
        <SheetHeader>
          <SheetTitle>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <nav aria-label={t('mainNavigation')} className="flex flex-col gap-1 px-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-lg px-3 font-medium hover:bg-accent"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center gap-2 border-t border-border px-3 pt-3 text-sm">
            <ThemeToggle />
            {t('theme')}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
