import type { EventCardDto } from '@doulisha/api';
import { CalendarDays, Plus, Ticket, Wallet } from 'lucide-react';
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
import { StatCard } from '@/components/doulisha/page';
import { PlacesLeft } from '@/components/doulisha/places-left';
import { PriceTag } from '@/components/doulisha/price-tag';
import { StatusBadge } from '@/components/doulisha/status-badge';
import { StickyCTA } from '@/components/doulisha/sticky-cta';
import { TicketQR } from '@/components/doulisha/ticket-qr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
 * Development gallery of design system v2 (docs/UX_GUIDELINES.md) in the
 * current language and theme. Switch to Arabic to check RTL. Hidden in
 * production; its labels are developer notes, not product copy.
 */
export default async function DesignPage({ params }: PageProps<'/[locale]/design'>) {
  if (process.env.NODE_ENV === 'production') notFound();
  await resolveLocale(params);
  const t = await getTranslations('States');

  return (
    <div className="mx-auto w-full max-w-5xl space-y-12 px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight">Design system v2</h1>

      <Demo title="Colours">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            'bg-primary',
            'bg-highlight',
            'bg-background',
            'bg-secondary',
            'bg-muted',
            'bg-card',
            'bg-primary-soft',
            'bg-success-soft',
            'bg-warning-soft',
            'bg-destructive-soft',
            'bg-info-soft',
            'bg-highlight-soft',
          ].map((c) => (
            <div key={c} className={`h-16 rounded-2xl border border-border/70 ${c}`} title={c} />
          ))}
        </div>
      </Demo>

      <Demo title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="soft">Soft</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button size="icon" variant="outline" aria-label="Add">
            <Plus aria-hidden="true" />
          </Button>
        </div>
      </Demo>

      <Demo title="Badges · status tones">
        <div className="flex flex-wrap gap-2">
          {(['neutral', 'primary', 'success', 'warning', 'danger', 'info', 'accent'] as const).map(
            (tone) => (
              <Badge key={tone} variant={tone} dot>
                {tone}
              </Badge>
            ),
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {['draft', 'published', 'full', 'ongoing', 'completed', 'cancelled'].map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </Demo>

      <Demo title="Card · StatCard · Input">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Card title</CardTitle>
              <CardDescription>Warm surface, 20 px radius, soft shadow.</CardDescription>
            </CardHeader>
            <CardContent>
              <Input placeholder="Input, 14 px radius" aria-label="Sample input" />
            </CardContent>
          </Card>
          <div className="grid gap-3">
            <StatCard icon={CalendarDays} label="Upcoming events" value={4} />
            <StatCard icon={Wallet} tone="accent" label="Collected" value="1 250 DT" />
            <StatCard icon={Ticket} tone="info" label="Booked" value={86} hint="12 this week" />
          </div>
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
              slug: 'kroumirie-trekkers',
              logoUrl: null,
              bio: 'Club de randonnée basé à Jendouba.',
              verified: true,
            }}
          />
        </div>
      </Demo>

      <Demo title="AttendeeRow">
        <div className="max-w-xl rounded-2xl border border-border/70 bg-card px-4 shadow-card">
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
            action={<Button>{t('retry')}</Button>}
          />
        </div>
      </Demo>

      <Demo title="StickyCTA">
        <div className="relative h-24 overflow-hidden rounded-2xl border border-dashed border-border">
          <StickyCTA
            className="absolute! lg:absolute!"
            summary={<PriceTag millimes={45_000} />}
            action={<Button>Get ticket</Button>}
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
