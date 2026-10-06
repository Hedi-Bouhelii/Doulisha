'use client';

import { AlertTriangle, ArrowLeft, ExternalLink, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { OrganizerProfileEditor } from '@/components/doulisha/organizer-profile-editor';
import { OrganizerProfileView } from '@/components/doulisha/organizer-profile-view';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { RouterOutputs } from '@/trpc/types';

type Profile = NonNullable<RouterOutputs['organizer']['myProfile']>;

/** The profile as participants see it; "Edit" swaps in the three-section editor. */
export function ProfileTab({
  profile,
  categories,
}: {
  profile: Profile;
  categories: { slug: string; name: string }[];
}) {
  const t = useTranslations('OrganizerProfile');
  const [editing, setEditing] = useState(false);
  const names = new Map(categories.map((c) => [c.slug, c.name]));
  const missingPayment = !profile.paymentInstructions.d17Number && !profile.paymentInstructions.rib;

  if (editing) {
    return (
      <div className="space-y-6">
        <Button
          type="button"
          variant="ghost"
          className="-ms-3 text-muted-foreground"
          onClick={() => setEditing(false)}
        >
          <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
          {t('backToPreview')}
        </Button>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {t('editTitle')}
        </h1>
        <OrganizerProfileEditor
          profile={profile}
          categories={categories}
          mode="edit"
          onDone={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {missingPayment ? (
        <p
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-warning/20 bg-warning-soft px-4 py-3 text-sm font-medium text-warning"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t('missingPayment')}
        </p>
      ) : null}
      <OrganizerProfileView
        profile={{
          ...profile,
          categories: profile.categories.map((slug) => names.get(slug) ?? slug),
          verified: profile.verifiedAt !== null,
        }}
        actions={
          <>
            <Button type="button" onClick={() => setEditing(true)} data-testid="edit-profile">
              <Pencil aria-hidden="true" />
              {t('edit')}
            </Button>
            <Button asChild variant="outline">
              <Link href={`/organizers/${profile.slug}`}>
                <ExternalLink aria-hidden="true" />
                {t('publicPage')}
              </Link>
            </Button>
          </>
        }
      />
    </div>
  );
}
