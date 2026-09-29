import { formatDate, type Locale } from '@doulisha/i18n';
import { getTranslations } from 'next-intl/server';
import { Fragment, type ReactNode } from 'react';

import { LEGAL_CONTACT, LEGAL_UPDATED, legalDocuments, type LegalKind } from '@/content/legal';

/** Turns the contact address inside a sentence into a mail link. */
function withContactLink(text: string): ReactNode {
  const parts = text.split(LEGAL_CONTACT);
  return parts.map((part, index) => (
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 ? (
        <a
          href={`mailto:${LEGAL_CONTACT}`}
          dir="ltr"
          className="font-medium text-primary underline underline-offset-2"
        >
          {LEGAL_CONTACT}
        </a>
      ) : null}
    </Fragment>
  ));
}

/**
 * Privacy, Terms and data deletion (ADR 0019): drafts written from what the
 * app really does, marked as such until a legal review before launch.
 */
export async function LegalPage({ kind, locale }: { kind: LegalKind; locale: Locale }) {
  const t = await getTranslations('Legal');
  const document = legalDocuments[locale][kind];
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6" data-testid={`legal-${kind}`}>
      <h1 className="text-3xl font-bold sm:text-4xl">{t(kind)}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('updated', { date: formatDate(LEGAL_UPDATED, locale) })}
      </p>
      <p
        role="note"
        className="mt-6 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground"
      >
        {t('draft')}
      </p>
      <p className="mt-6 text-lg">{withContactLink(document.intro)}</p>
      {document.sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="font-sans text-xl font-semibold">{section.heading}</h2>
          {section.items ? (
            <ul className="mt-3 list-disc space-y-2 ps-6">
              {section.items.map((item) => (
                <li key={item}>{withContactLink(item)}</li>
              ))}
            </ul>
          ) : null}
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="mt-3">
              {withContactLink(paragraph)}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
