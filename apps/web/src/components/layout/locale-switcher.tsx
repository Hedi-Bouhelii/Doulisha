'use client';

import { locales, type Locale } from '@doulisha/i18n';
import { Check, Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePathname, useRouter } from '@/i18n/navigation';

/**
 * Switches between العربية, Français and English on the same page. The layout
 * flips to right-to-left for Arabic because <html dir> follows the locale.
 */
export function LocaleSwitcher() {
  const t = useTranslations();
  const current = useLocale() as Locale;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(locale: Locale) {
    const query = Object.fromEntries(searchParams.entries());
    startTransition(() => router.replace({ pathname, query }, { locale }));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={t('Nav.language')}
          disabled={pending}
          data-testid="locale-switcher"
        >
          <Languages className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('Nav.language')}</DropdownMenuLabel>
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            lang={locale}
            onSelect={() => change(locale)}
            className="min-h-11 justify-between gap-6"
            data-testid={`locale-${locale}`}
          >
            {t(`Languages.${locale}`)}
            {locale === current ? <Check className="size-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
