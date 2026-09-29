import { BadgeCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from '@/i18n/navigation';

import { initials } from './friends-going';

/** Organizer summary on event pages (ACC-03, TRS-02 stats come in Phase 5). */
export function OrganizerCard({
  organizer,
}: {
  organizer: {
    name: string;
    slug: string;
    logoUrl: string | null;
    bio: string | null;
    verified: boolean;
  };
}) {
  const t = useTranslations('Event');
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
      <Avatar className="size-12">
        {organizer.logoUrl ? <AvatarImage src={organizer.logoUrl} alt="" /> : null}
        <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
          {initials(organizer.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t('organizer')}
        </p>
        <p className="flex items-center gap-1.5 font-semibold">
          {organizer.name}
          {organizer.verified ? (
            <BadgeCheck className="size-4 text-primary" aria-label={t('verified')} />
          ) : null}
        </p>
        {organizer.bio ? (
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{organizer.bio}</p>
        ) : null}
        <Link
          href={`/organizers/${organizer.slug}`}
          className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
          data-testid="organizer-link"
        >
          {t('seeOrganizer')}
        </Link>
      </div>
    </div>
  );
}
