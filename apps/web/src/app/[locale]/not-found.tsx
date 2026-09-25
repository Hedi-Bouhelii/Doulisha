import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/doulisha/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

/** Localized 404 (spec section 4 quick win: no dead links). */
export default function NotFound() {
  const t = useTranslations('States');
  return (
    <main id="main" className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-16">
      <EmptyState
        className="w-full"
        title={t('notFoundTitle')}
        hint={t('notFoundHint')}
        action={
          <Button asChild className="min-h-11">
            <Link href="/">{t('backHome')}</Link>
          </Button>
        }
      />
    </main>
  );
}
