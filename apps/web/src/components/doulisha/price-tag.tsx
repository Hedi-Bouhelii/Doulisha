import { formatPrice, type Locale } from '@doulisha/i18n';
import { useLocale, useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

/** "From 45 DT" or "Free". Amounts are integer millimes. */
export function PriceTag({
  millimes,
  from = true,
  className,
}: {
  millimes: number | null;
  from?: boolean;
  className?: string;
}) {
  const t = useTranslations('Event');
  const locale = useLocale() as Locale;
  if (millimes === null || millimes === 0) {
    return <span className={cn('font-semibold text-primary', className)}>{t('free')}</span>;
  }
  const price = formatPrice(millimes, locale);
  return (
    <span className={cn('font-semibold', className)}>{from ? t('from', { price }) : price}</span>
  );
}
