import { ArrowRight, BadgeCheck } from 'lucide-react';
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
    <div className="flex items-start gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-card">
      <Avatar className="size-14 ring-2 ring-background shadow-xs">
        {organizer.logoUrl ? <AvatarImage src={organizer.logoUrl} alt="" /> : null}
        <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
          {initials(organizer.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t('organizer')}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-lg font-semibold" dir="auto">
          {organizer.name}
          {organizer.verified ? (
            <BadgeCheck className="size-5 shrink-0 text-primary" aria-label={t('verified')} />
          ) : null}
        </p>
        {organizer.bio ? (
          <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {organizer.bio}
          </p>
        ) : null}
        <Link
          href={`/organizers/${organizer.slug}`}
          className="group mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary"
          data-testid="organizer-link"
        >
          {t('seeOrganizer')}
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </div>
  );
}
