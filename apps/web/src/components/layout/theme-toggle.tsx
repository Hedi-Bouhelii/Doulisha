'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Light / dark switch. The first render follows the system preference. */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('Nav');
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('size-11', className)}
      aria-label={`${t('theme')}: ${isDark ? t('themeLight') : t('themeDark')}`}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <Sun className="hidden size-5 dark:block" />
      <Moon className="size-5 dark:hidden" />
    </Button>
  );
}
