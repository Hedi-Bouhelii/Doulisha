import { formatDate, type Locale } from '@doulisha/i18n';
import { FileText, Info } from 'lucide-react';
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
 * app really does, marked as such until a legal review before launch. A
 * reading layout: numbered sections, and their list beside the text on large
 * screens.
 */
export async function LegalPage({ kind, locale }: { kind: LegalKind; locale: Locale }) {
  const t = await getTranslations('Legal');
  const document = legalDocuments[locale][kind];
  return (
    <article
      className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14"
      data-testid={`legal-${kind}`}
    >
      <header className="max-w-3xl">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <FileText className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">
          {t(kind)}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t('updated', { date: formatDate(LEGAL_UPDATED, locale) })}
        </p>
        <p
          role="note"
          className="mt-6 flex items-start gap-3 rounded-2xl bg-info-soft px-4 py-3 text-sm text-info"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t('draft')}
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_16rem]">
        <div className="max-w-3xl rounded-3xl border border-border/70 bg-card p-6 shadow-card sm:p-10">
          <p className="text-lg leading-relaxed">{withContactLink(document.intro)}</p>
          {document.sections.map((section, index) => (
            <section
              key={section.heading}
              id={`section-${index + 1}`}
              className="mt-10 scroll-mt-24"
            >
              <h2 className="flex items-baseline gap-3 font-sans text-xl font-semibold">
                <span className="ltr-nums text-sm font-bold text-highlight">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {section.heading}
              </h2>
              {section.items ? (
                <ul className="mt-4 list-disc space-y-2.5 ps-6 leading-relaxed marker:text-primary">
                  {section.items.map((item) => (
                    <li key={item}>{withContactLink(item)}</li>
                  ))}
                </ul>
              ) : null}
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-4 leading-relaxed text-foreground/90">
                  {withContactLink(paragraph)}
                </p>
              ))}
            </section>
          ))}
        </div>
        <nav aria-labelledby="legal-toc" className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-border/70 bg-card p-5 shadow-card">
            <p
              id="legal-toc"
              className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
            >
              {t('onThisPage')}
            </p>
            <ol className="mt-3 space-y-1 text-sm">
              {document.sections.map((section, index) => (
                <li key={section.heading}>
                  <a
                    href={`#section-${index + 1}`}
                    className="flex min-h-9 items-baseline gap-2 rounded-lg px-2 py-1.5 text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <span className="ltr-nums text-xs font-semibold text-highlight">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>
      </div>
    </article>
  );
}
