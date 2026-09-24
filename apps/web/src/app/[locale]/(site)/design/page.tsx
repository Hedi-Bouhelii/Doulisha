import type { EventCardDto } from '@doulisha/api';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { AttendeeRow } from '@/components/doulisha/attendee-row';
import { CategoryChip } from '@/components/doulisha/category-chip';
import { CategoryTile } from '@/components/doulisha/category-tile';
import { EmptyState } from '@/components/doulisha/empty-state';
import { EventCard, EventCardSkeleton } from '@/components/doulisha/event-card';
import { FriendsGoing } from '@/components/doulisha/friends-going';
import { OrganizerCard } from '@/components/doulisha/organizer-card';
import { PlacesLeft } from '@/components/doulisha/places-left';
import { PriceTag } from '@/components/doulisha/price-tag';
import { StickyCTA } from '@/components/doulisha/sticky-cta';
import { TicketQR } from '@/components/doulisha/ticket-qr';
import { Button } from '@/components/ui/button';
import { resolveLocale } from '@/i18n/locale';

export const metadata: Metadata = { robots: { index: false } };

const sampleEvent: EventCardDto = {
  id: 'sample',
  slug: 'randonnee-foret-ain-draham',
  title: 'Randonnée en forêt à Aïn Draham',
  coverUrl: '/images/events/ain-draham-hike.webp',
  startsAt: new Date('2026-10-03T06:00:00Z'),
  city: 'Aïn Draham',
  venueName: 'Forêt de Kroumirie',
  category: { slug: 'outdoor', name: 'Sorties et nature', icon: 'mountain', accent: 'outdoor' },
  templateName: 'Randonnée',
  registrationType: 'deposit',
  priceFromMillimes: 65_000,
  capacity: 30,
  placesTaken: 27,
  placesLeft: 3,
  organizer: { name: 'Kroumirie Trekkers', slug: 'kroumirie-trekkers', verified: true },
};

/**
 * Development gallery of the base components (BUILD_PROMPT section 6) in the
 * current language and theme. Switch to Arabic to check RTL. Hidden in production.
 */
export default async function DesignPage({ params }: PageProps<'/[locale]/design'>) {
  if (process.env.NODE_ENV === 'production') notFound();
  await resolveLocale(params);
  const t = await getTranslations('States');

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-bold">Design system</h1>

      <Demo title="Colours">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            'bg-primary',
            'bg-highlight',
            'bg-background',
            'bg-secondary',
            'bg-muted',
            'bg-card',
          ].map((c) => (
            <div key={c} className={`h-16 rounded-lg border border-border ${c}`} title={c} />
          ))}
        </div>
      </Demo>

      <Demo title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button className="min-h-11">Primary</Button>
          <Button variant="outline" className="min-h-11">
            Secondary
          </Button>
          <Button className="min-h-11 bg-highlight text-highlight-foreground hover:bg-highlight/90">
            Highlight
          </Button>
          <Button variant="ghost" className="min-h-11">
            Ghost
          </Button>
        </div>
      </Demo>

      <Demo title="CategoryChip · CategoryTile">
        <div className="flex flex-wrap gap-2">
          <CategoryChip href="/design" label="All" active />
          <CategoryChip href="/design" label="Trips" icon="mountain" />
          <CategoryChip href="/design" label="Concerts" icon="music" />
        </div>
        <div className="mt-4 grid max-w-md grid-cols-3 gap-3">
          <CategoryTile href="/design" label="Trips" icon="mountain" accent="outdoor" />
          <CategoryTile href="/design" label="Sports" icon="volleyball" accent="sports" />
          <CategoryTile href="/design" label="Parties" icon="music" accent="entertainment" />
        </div>
      </Demo>

      <Demo title="EventCard · loading skeleton">
        <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <EventCard event={sampleEvent} />
          <EventCardSkeleton />
        </div>
      </Demo>

      <Demo title="PriceTag · PlacesLeft · FriendsGoing">
        <div className="flex flex-wrap items-center gap-6">
          <PriceTag millimes={45_000} />
          <PriceTag millimes={null} />
          <PlacesLeft capacity={25} left={7} />
          <PlacesLeft capacity={25} left={2} />
          <PlacesLeft capacity={25} left={0} />
          <FriendsGoing
            people={[
              { name: 'Omar Chaabane', image: null },
              { name: 'Yasmine Ayari', image: null },
              { name: 'Ines Hamdi', image: null },
            ]}
            count={42}
          />
        </div>
      </Demo>

      <Demo title="OrganizerCard">
        <div className="max-w-md">
          <OrganizerCard
            organizer={{
              name: 'Kroumirie Trekkers',
              logoUrl: null,
              bio: 'Club de randonnée basé à Jendouba.',
              verified: true,
            }}
          />
        </div>
      </Demo>

      <Demo title="AttendeeRow">
        <div className="max-w-xl rounded-xl border border-border bg-card px-4">
          <AttendeeRow
            name="Omar Chaabane"
            ticket="Standard"
            phone="+21650000002"
            payment="paid"
            paymentLabel="Paid"
            checkedIn
            checkedInLabel="Checked in"
          />
          <AttendeeRow
            name="Ines Hamdi"
            ticket="Standard"
            payment="deposit"
            paymentLabel="Deposit"
            checkedIn={false}
            checkedInLabel="Checked in"
          />
          <AttendeeRow
            name="Aziz Ben Ammar"
            ticket="Standard"
            payment="pending"
            paymentLabel="Pending"
            checkedIn={false}
            checkedInLabel="Checked in"
          />
          <AttendeeRow
            name="Nour Khelifi"
            ticket="Standard"
            payment="refunded"
            paymentLabel="Refunded"
            checkedIn={false}
            checkedInLabel="Checked in"
          />
        </div>
      </Demo>

      <Demo title="TicketQR">
        <TicketQR code="7K3Q9PXM2WAB" reference="DLS-7K3Q9P" label="Ticket QR code" />
      </Demo>

      <Demo title="EmptyState (empty and error)">
        <div className="grid gap-4 sm:grid-cols-2">
          <EmptyState title={t('emptyEventsTitle')} hint={t('emptyEventsHint')} />
          <EmptyState
            tone="alert"
            title={t('errorTitle')}
            hint={t('errorHint')}
            action={<Button className="min-h-11">{t('retry')}</Button>}
          />
        </div>
      </Demo>

      <Demo title="StickyCTA">
        <div className="relative h-24 overflow-hidden rounded-xl border border-dashed border-border">
          <StickyCTA
            className="absolute! lg:absolute!"
            summary={<PriceTag millimes={45_000} />}
            action={<Button className="min-h-11 rounded-full px-6">Get ticket</Button>}
          />
        </div>
      </Demo>
    </div>
  );
}

function Demo({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-sans text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
