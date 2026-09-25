'use client';

import { ExternalLink, Pencil } from 'lucide-react';
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
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{t('editTitle')}</h1>
        <OrganizerProfileEditor
          profile={profile}
          categories={categories}
          mode="edit"
          onDone={() => setEditing(false)}
        />
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={() => setEditing(false)}
        >
          {t('backToPreview')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {missingPayment ? (
        <p
          role="status"
          className="rounded-lg border border-highlight/30 bg-highlight-soft p-3 text-sm text-highlight"
        >
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
            <Button
              type="button"
              className="min-h-11 rounded-full"
              onClick={() => setEditing(true)}
              data-testid="edit-profile"
            >
              <Pencil aria-hidden="true" />
              {t('edit')}
            </Button>
            <Button asChild variant="outline" className="min-h-11 rounded-full">
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
