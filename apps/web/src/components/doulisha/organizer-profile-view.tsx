import { BadgeCheck, Mail, MapPin, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import type { ReactNode } from 'react';

import { initials } from './friends-going';
import { socialNetworks } from './social-icons';

export interface OrganizerProfileData {
  name: string;
  bio: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  /** Category names, already localized. */
  categories: string[];
  regions: string[];
  socialLinks: Record<string, string>;
  contactPhone: string | null;
  contactEmail: string | null;
  legalStatus: 'association' | 'company' | 'independent';
  verified: boolean;
  photos: { id: string; url: string; caption: string | null }[];
}

/**
 * ACC-03 organizer profile as participants see it: cover and logo, name and
 * badge, about, what and where, links, contacts and past-event photos.
 * `actions` sits next to the name (edit button in the organizer space);
 * `children` renders below (upcoming events on the public page).
 */
export function OrganizerProfileView({
  profile,
  actions,
  children,
}: {
  profile: OrganizerProfileData;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const t = useTranslations('OrganizerProfile');
  const tLegal = useTranslations('Organizer.legal');
  const tEvent = useTranslations('Event');
  const links = socialNetworks.filter((n) => profile.socialLinks[n.key]);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-[5/2] max-h-72 w-full bg-secondary sm:aspect-[4/1]">
        {profile.coverUrl ? (
          <Image
            src={profile.coverUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-primary/25 via-secondary to-highlight/20" />
        )}
      </div>
      <div className="px-4 pb-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-end gap-3">
            <div className="relative -mt-10 size-20 shrink-0 overflow-hidden rounded-2xl border-4 border-card bg-muted shadow-sm sm:-mt-12 sm:size-24">
              {profile.logoUrl ? (
                <Image src={profile.logoUrl} alt="" fill sizes="96px" className="object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-2xl font-bold text-primary">
                  {initials(profile.name)}
                </span>
              )}
            </div>
            <div className="min-w-0 pt-3 pb-1">
              <h1
                className="flex flex-wrap items-center gap-2 text-2xl font-bold sm:text-3xl"
                data-testid="organizer-name"
              >
                {profile.name}
                {profile.verified ? (
                  <BadgeCheck className="size-6 text-primary" aria-label={tEvent('verified')} />
                ) : null}
              </h1>
              <p className="text-sm text-muted-foreground">{tLegal(profile.legalStatus)}</p>
            </div>
          </div>
          {actions ? <div className="flex flex-wrap gap-2 pb-1">{actions}</div> : null}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_16rem]">
          <div className="min-w-0 space-y-6">
            {profile.bio ? (
              <section>
                <h2 className="mb-2 font-sans text-base font-semibold">{t('about')}</h2>
                <p dir="auto" className="text-start whitespace-pre-line text-foreground/90">
                  {profile.bio}
                </p>
              </section>
            ) : null}
            {profile.categories.length > 0 ? (
              <section>
                <h2 className="mb-2 font-sans text-base font-semibold">{t('organizes')}</h2>
                <ul className="flex flex-wrap gap-2">
                  {profile.categories.map((c) => (
                    <li key={c} className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
                      {c}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section>
              <h2 className="mb-3 font-sans text-base font-semibold">{t('pastEvents')}</h2>
              {profile.photos.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noPhotos')}</p>
              ) : (
                <ul
                  className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                  data-testid="organizer-photos"
                >
                  {profile.photos.map((photo) => (
                    <li
                      key={photo.id}
                      className="relative aspect-square overflow-hidden rounded-xl bg-muted"
                    >
                      <Image
                        src={photo.url}
                        alt={photo.caption ?? ''}
                        fill
                        sizes="(min-width: 640px) 33vw, 50vw"
                        className="object-cover"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-4 text-sm">
            {profile.regions.length > 0 ? (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{profile.regions.join(' · ')}</span>
              </p>
            ) : null}
            {profile.contactPhone ? (
              <p className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <a
                  href={`tel:${profile.contactPhone}`}
                  dir="ltr"
                  className="ltr-nums hover:underline"
                >
                  {profile.contactPhone}
                </a>
              </p>
            ) : null}
            {profile.contactEmail ? (
              <p className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <a
                  href={`mailto:${profile.contactEmail}`}
                  dir="ltr"
                  className="truncate hover:underline"
                >
                  {profile.contactEmail}
                </a>
              </p>
            ) : null}
            {links.length > 0 ? (
              <ul className="flex flex-wrap gap-2" aria-label={t('links')}>
                {links.map(({ key, label, Icon }) => (
                  <li key={key}>
                    <a
                      href={profile.socialLinks[key]}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="flex min-h-11 items-center gap-2 rounded-full border border-border px-3 font-medium hover:bg-accent"
                    >
                      <Icon className="size-4" />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </aside>
        </div>
        {children}
      </div>
    </article>
  );
}
