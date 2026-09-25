import { getTranslations } from 'next-intl/server';

/**
 * Terms and privacy placeholders. The texts come from the founder's lawyer
 * (OPEN_QUESTIONS); until then the page says so plainly instead of inventing
 * legal wording.
 */
export async function LegalPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const t = await getTranslations('Legal');
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold sm:text-4xl">{t(kind)}</h1>
      <p
        role="note"
        className="mt-6 rounded-xl border border-border bg-card p-4 text-muted-foreground"
      >
        {t('draft')}
      </p>
    </div>
  );
}
