/**
 * Demo data for Doulisha: realistic Tunisian organizers, members, events and
 * payments in every state, enough to demo every screen (BUILD_PROMPT section 7).
 *
 * Usage: pnpm --filter @doulisha/db db:seed [--force]
 * The seed wipes the database first. It refuses to run on the `production`
 * Neon branch unless --force is passed.
 *
 * Arabic content needs review by a native speaker. TODO(i18n-review)
 */
import { categories as categoryDefs, templateDefinitions } from '@doulisha/templates';
import { getTableName, isTable, sql } from 'drizzle-orm';

import { createPoolDb, type PoolDb } from '../client';
import { loadRootEnv, requireEnv } from '../load-env';
import * as s from '../schema';
import { dt, nextWeekday, orderReference, ticketCode, tunisDate } from './helpers';

loadRootEnv();

const force = process.argv.includes('--force');
if (process.env.NEON_BRANCH === 'production' && !force) {
  console.error('Refusing to seed the production branch. Pass --force if you really mean it.');
  process.exit(1);
}

const now = new Date();
const img = (name: string) => `/images/events/${name}.webp`;

type Tx = Parameters<Parameters<PoolDb['transaction']>[0]>[0];

async function wipe(tx: Tx) {
  const tables = Object.values(s)
    .filter((value) => isTable(value))
    .map((table) => `"${getTableName(table)}"`);
  await tx.execute(sql.raw(`TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE`));
}

async function seed(tx: Tx) {
  // --- Categories and templates (EVT-09) ---------------------------------------
  const categoryRows = await tx
    .insert(s.categories)
    .values(categoryDefs.map((c) => ({ ...c })))
    .returning();
  const categoryId = (slug: string) => categoryRows.find((c) => c.slug === slug)!.id;

  const templateRows = await tx
    .insert(s.templates)
    .values(
      templateDefinitions.map((t) => ({
        key: t.key,
        categoryId: categoryId(t.categorySlug),
        model: t.model,
        name: t.name,
        definition: t.definition,
        isActive: t.isActive,
      })),
    )
    .returning();
  const template = (key: string) => templateRows.find((t) => t.key === key)!;

  // --- Members -------------------------------------------------------------------
  const people = [
    {
      key: 'admin',
      name: 'Amine Admin',
      phone: '+21620000001',
      email: 'admin@doulisha.tn',
      city: 'Tunis',
    },
    {
      key: 'sami',
      name: 'Sami Ben Salah',
      phone: '+21622000001',
      email: 'sami@kroumirie-trekkers.tn',
      city: 'Jendouba',
    },
    {
      key: 'leila',
      name: 'Leila Trabelsi',
      phone: '+21622000002',
      email: 'leila@tunislive.tn',
      city: 'La Marsa',
    },
    {
      key: 'mariem',
      name: 'Mariem Jaziri',
      phone: '+21622000003',
      email: 'mariem@atelier-fekhar.tn',
      city: 'Sidi Bou Saïd',
    },
    {
      key: 'youssef',
      name: 'Youssef Gharbi',
      phone: '+21622000004',
      email: 'youssef@tunistech.org',
      city: 'Tunis',
    },
    {
      key: 'karim',
      name: 'Karim Mansouri',
      phone: '+21622000005',
      email: 'karim@sahara-nomads.tn',
      city: 'Tozeur',
    },
    {
      key: 'yasmine',
      name: 'Yasmine Ayari',
      phone: '+21650000001',
      email: 'yasmine.ayari@example.tn',
      city: 'Tunis',
    },
    {
      key: 'omar',
      name: 'Omar Chaabane',
      phone: '+21650000002',
      email: 'omar.chaabane@example.tn',
      city: 'Ariana',
    },
    {
      key: 'ines',
      name: 'Ines Hamdi',
      phone: '+21650000003',
      email: 'ines.hamdi@example.tn',
      city: 'Sousse',
    },
    {
      key: 'aziz',
      name: 'Aziz Ben Ammar',
      phone: '+21650000004',
      email: 'aziz.benammar@example.tn',
      city: 'Tunis',
    },
    {
      key: 'nour',
      name: 'Nour Khelifi',
      phone: '+21650000005',
      email: 'nour.khelifi@example.tn',
      city: 'Sfax',
    },
    {
      key: 'rania',
      name: 'Rania Dridi',
      phone: '+21650000006',
      email: 'rania.dridi@example.tn',
      city: 'Bizerte',
    },
    {
      key: 'mehdi',
      name: 'Mehdi Sassi',
      phone: '+21650000007',
      email: 'mehdi.sassi@example.tn',
      city: 'Nabeul',
    },
    {
      key: 'salma',
      name: 'Salma Mejri',
      phone: '+21650000008',
      email: 'salma.mejri@example.tn',
      city: 'Monastir',
    },
  ] as const;
  type PersonKey = (typeof people)[number]['key'];

  const userRows = await tx
    .insert(s.users)
    .values(
      people.map((p) => ({
        name: p.name,
        email: p.email,
        emailVerified: true,
        phoneNumber: p.phone,
        phoneNumberVerified: true,
      })),
    )
    .returning();
  const user = (key: PersonKey) => userRows[people.findIndex((p) => p.key === key)]!;

  // A guest who answered an invitation from a WhatsApp link, without an account (INV-02).
  const [guest] = await tx
    .insert(s.users)
    .values({
      name: 'Hana (invitée)',
      email: 'guest-hana@guest.doulisha.invalid',
      isAnonymous: true,
    })
    .returning();

  const profileRows: (typeof s.profiles.$inferInsert)[] = [
    ...people.map((p) => ({
      userId: user(p.key).id,
      city: p.city,
      username: p.key,
      locale: p.key === 'nour' || p.key === 'aziz' ? ('ar' as const) : ('fr' as const),
      interests: ['outdoor', 'entertainment', 'learning'],
      sportLevels: p.key === 'mehdi' ? { padel: 4 } : ({} as Record<string, number>),
    })),
    { userId: guest!.id },
  ];
  await tx.insert(s.profiles).values(profileRows);

  await tx.insert(s.userRoles).values([
    { userId: user('admin').id, role: 'admin' },
    ...(['sami', 'leila', 'mariem', 'youssef', 'karim'] as const).map((k) => ({
      userId: user(k).id,
      role: 'organizer' as const,
    })),
    { userId: user('rania').id, role: 'provider' },
  ]);

  // --- Organizers (ACC-03) and their trial (spec 10.1) --------------------------
  const organizerRows = await tx
    .insert(s.organizerProfiles)
    .values([
      {
        ownerUserId: user('sami').id,
        slug: 'kroumirie-trekkers',
        name: 'Kroumirie Trekkers',
        bio: 'Club de randonnée basé à Jendouba. Forêts de chênes-lièges, cascades et sentiers du Nord-Ouest depuis 2016.',
        categories: ['outdoor'],
        regions: ['Jendouba', 'Béja', 'Bizerte'],
        socialLinks: { instagram: 'https://instagram.com/kroumirie.trekkers' },
        legalStatus: 'association',
        verifiedAt: now,
      },
      {
        ownerUserId: user('leila').id,
        slug: 'tunis-live',
        name: 'Tunis Live',
        bio: 'Concerts, DJ sets and open-air nights in Greater Tunis.',
        categories: ['entertainment'],
        regions: ['Tunis', 'La Marsa'],
        legalStatus: 'company',
        verifiedAt: now,
      },
      {
        ownerUserId: user('mariem').id,
        slug: 'atelier-fekhar',
        name: 'Atelier Fekhar',
        bio: 'Atelier de poterie et de céramique à Sidi Bou Saïd. Cours pour débutants et confirmés.',
        categories: ['learning'],
        regions: ['Sidi Bou Saïd'],
        legalStatus: 'independent',
        verifiedAt: now,
      },
      {
        ownerUserId: user('youssef').id,
        slug: 'tunis-tech-meetup',
        name: 'Tunis Tech Meetup',
        bio: 'A volunteer community of developers and designers. Monthly talks and hands-on workshops.',
        categories: ['learning'],
        regions: ['Tunis'],
        legalStatus: 'association',
      },
      {
        ownerUserId: user('karim').id,
        slug: 'sahara-nomads',
        name: 'Sahara Nomads',
        bio: 'Petite agence de Tozeur : week-ends dans le désert, bivouacs et oasis.',
        categories: ['outdoor'],
        regions: ['Tozeur', 'Kébili'],
        legalStatus: 'company',
      },
    ])
    .returning();
  const organizer = (slug: string) => organizerRows.find((o) => o.slug === slug)!;

  await tx.insert(s.subscriptions).values(
    organizerRows.map((o, i) => ({
      userId: o.ownerUserId,
      plan: i < 2 ? ('pro' as const) : ('free' as const),
      status: i < 2 ? ('active' as const) : ('trialing' as const),
      trialEndsAt: tunisDate(now, 45, '23:59'),
      trialPaidEventsUsed: i < 2 ? 3 : 1,
      currentPeriodEnd: i < 2 ? tunisDate(now, 30, '23:59') : null,
    })),
  );

  // --- Provider directory (PRV-01/02) ---------------------------------------------
  await tx.insert(s.providerProfiles).values([
    {
      ownerUserId: user('rania').id,
      slug: 'dar-yasmina',
      name: 'Dar Yasmina',
      type: 'venue',
      city: 'Sidi Bou Saïd',
      bio: 'Maison traditionnelle avec terrasse pour anniversaires et dîners (jusqu’à 40 invités).',
      priceMinMillimes: dt(800),
      priceMaxMillimes: dt(2500),
      phone: '+21650000006',
      whatsapp: '+21650000006',
      verifiedAt: now,
    },
    {
      ownerUserId: user('rania').id,
      slug: 'patisserie-el-bey',
      name: 'Pâtisserie El Bey',
      type: 'catering',
      city: 'Tunis',
      bio: 'Gâteaux d’anniversaire et douceurs tunisiennes sur commande.',
      priceMinMillimes: dt(60),
      priceMaxMillimes: dt(400),
      whatsapp: '+21650000006',
    },
  ]);

  // --- Public events ------------------------------------------------------------------
  const sat = nextWeekday(now, 6, 3);
  const sun = nextWeekday(now, 0, 3);

  const eventRows = await tx
    .insert(s.events)
    .values([
      {
        slug: 'randonnee-foret-ain-draham',
        organizerProfileId: organizer('kroumirie-trekkers').id,
        creatorId: user('sami').id,
        templateId: template('hiking_trip').id,
        categoryId: categoryId('outdoor'),
        model: 'group_trip',
        status: 'published',
        title: 'Randonnée en forêt à Aïn Draham',
        description:
          'Une journée dans la forêt de chênes-lièges de Kroumirie : 14 km de sentiers, la cascade d’Oued Zouaraa et un déjeuner chez l’habitant.',
        language: 'fr',
        coverUrl: img('ain-draham-hike'),
        startsAt: tunisDate(now, sat, '07:00'),
        endsAt: tunisDate(now, sat, '19:00'),
        venueName: 'Forêt de Kroumirie',
        city: 'Aïn Draham',
        location: { lng: 8.6874, lat: 36.7797 },
        capacity: 30,
        minToConfirm: 12,
        placesTaken: 18,
        registrationType: 'deposit',
        priceFromMillimes: dt(65),
        cancellationPolicy: 'moderate',
        brief: {
          whatToBring: [
            'Chaussures de randonnée',
            'Eau (2 litres)',
            'Coupe-vent',
            'Pièce d’identité',
          ],
          safety: 'Restez avec le groupe. Un guide ouvre et un guide ferme la marche.',
        },
        details: { difficulty: 3, distanceKm: 14, elevationM: 520 },
        publishedAt: now,
      },
      {
        slug: 'live-music-night-la-marsa',
        organizerProfileId: organizer('tunis-live').id,
        creatorId: user('leila').id,
        templateId: template('concert_party').id,
        categoryId: categoryId('entertainment'),
        model: 'ticketed',
        status: 'published',
        title: 'Live Music Night',
        description:
          'An unforgettable night with the best local artists, food trucks and a unique atmosphere by the sea. Don’t miss it!',
        language: 'en',
        coverUrl: img('live-music-night'),
        startsAt: tunisDate(now, sat + 7, '20:00'),
        endsAt: tunisDate(now, sat + 8, '00:00'),
        venueName: 'La Marsa Amphitheatre',
        city: 'La Marsa',
        location: { lng: 10.3247, lat: 36.8782 },
        minAge: 18,
        capacity: 500,
        placesTaken: 250,
        registrationType: 'paid',
        priceFromMillimes: dt(35),
        cancellationPolicy: 'strict',
        brief: { rules: 'ID required at the door. No glass bottles.' },
        details: {
          lineup: 'Les Oliviers, Nour Band, DJ Kahena (fictional demo artists)',
          genre: 'live',
        },
        publishedAt: now,
      },
      {
        slug: 'atelier-poterie-sidi-bou-said',
        organizerProfileId: organizer('atelier-fekhar').id,
        creatorId: user('mariem').id,
        templateId: template('workshop_class').id,
        categoryId: categoryId('learning'),
        model: 'ticketed',
        status: 'published',
        title: 'Atelier poterie à Sidi Bou Saïd',
        description:
          'Initiation au tour de potier dans un atelier avec vue sur le golfe. Vous repartez avec vos deux pièces après cuisson.',
        language: 'fr',
        coverUrl: img('pottery-sidi-bou-said'),
        startsAt: tunisDate(now, sun, '10:00'),
        endsAt: tunisDate(now, sun, '13:00'),
        venueName: 'Atelier Fekhar',
        address: 'Rue Habib Thameur, Sidi Bou Saïd',
        city: 'Sidi Bou Saïd',
        location: { lng: 10.3417, lat: 36.8687 },
        capacity: 12,
        placesTaken: 9,
        registrationType: 'paid',
        priceFromMillimes: dt(55),
        cancellationPolicy: 'flexible',
        brief: { whatToBring: ['Tenue qui peut être salie'] },
        details: { level: 'beginner', materialsIncluded: true, sessions: 1 },
        publishedAt: now,
      },
      {
        slug: 'rando-coucher-soleil-zaghouan',
        organizerProfileId: organizer('kroumirie-trekkers').id,
        creatorId: user('sami').id,
        templateId: template('hiking_trip').id,
        categoryId: categoryId('outdoor'),
        model: 'group_trip',
        status: 'published',
        title: 'Rando coucher de soleil & pique-nique à Zaghouan',
        language: 'fr',
        coverUrl: img('zaghouan-sunset-hike'),
        startsAt: tunisDate(now, sat - 1 > 2 ? sat - 1 : sat + 6, '15:00'),
        city: 'Zaghouan',
        venueName: 'Jebel Zaghouan',
        location: { lng: 10.1, lat: 36.37 },
        capacity: 25,
        placesTaken: 16,
        registrationType: 'paid',
        priceFromMillimes: dt(35),
        details: { difficulty: 2, distanceKm: 8, elevationM: 350 },
        publishedAt: now,
      },
      {
        slug: 'tech-ai-workshop-tunis',
        organizerProfileId: organizer('tunis-tech-meetup').id,
        creatorId: user('youssef').id,
        templateId: template('workshop_class').id,
        categoryId: categoryId('learning'),
        model: 'ticketed',
        status: 'published',
        title: 'Tech & AI Workshop: build with LLMs',
        description:
          'Hands-on evening: build a small AI assistant in TypeScript. Laptops required.',
        language: 'en',
        coverUrl: img('tech-ai-workshop'),
        startsAt: tunisDate(now, 5, '17:00'),
        endsAt: tunisDate(now, 5, '20:00'),
        venueName: 'Espace coworking Lac 2',
        city: 'Tunis',
        location: { lng: 10.2728, lat: 36.8453 },
        capacity: 60,
        placesTaken: 34,
        registrationType: 'free_rsvp',
        details: { level: 'intermediate', materialsIncluded: false, sessions: 1 },
        publishedAt: now,
      },
      {
        slug: 'atelier-cuisine-traditionnelle-medina',
        organizerProfileId: organizer('atelier-fekhar').id,
        creatorId: user('mariem').id,
        templateId: template('workshop_class').id,
        categoryId: categoryId('learning'),
        model: 'ticketed',
        status: 'published',
        title: 'ورشة طبخ تقليدي: الكسكسي التونسي',
        description:
          'تعلّم تحضير الكسكسي بالخضر مع عائلة من المدينة العتيقة، ثم نتقاسم الغداء معاً.',
        language: 'ar',
        coverUrl: img('traditional-cooking'),
        startsAt: tunisDate(now, sat + 7, '10:00'),
        venueName: 'Dar El Medina',
        city: 'Tunis',
        location: { lng: 10.1706, lat: 36.7992 },
        capacity: 10,
        placesTaken: 7,
        registrationType: 'paid',
        priceFromMillimes: dt(70),
        details: { level: 'beginner', materialsIncluded: true, sessions: 1 },
        publishedAt: now,
      },
      {
        slug: 'beach-volley-hammamet',
        creatorId: user('mehdi').id,
        templateId: template('sports_session').id,
        categoryId: categoryId('sports'),
        model: 'ticketed',
        status: 'published',
        title: 'Beach-volley au coucher du soleil',
        language: 'fr',
        coverUrl: img('beach-volleyball'),
        startsAt: tunisDate(now, sun, '17:00'),
        venueName: 'Plage Yasmine',
        city: 'Hammamet',
        location: { lng: 10.5936, lat: 36.3717 },
        capacity: 24,
        placesTaken: 12,
        registrationType: 'free_rsvp',
        details: { sport: 'Beach-volley', level: 'all' },
        publishedAt: now,
      },
      {
        slug: 'escapade-desert-tozeur-douz',
        organizerProfileId: organizer('sahara-nomads').id,
        creatorId: user('karim').id,
        templateId: template('hiking_trip').id,
        categoryId: categoryId('outdoor'),
        model: 'group_trip',
        status: 'published',
        title: 'Escapade dans le désert : Tozeur & Douz',
        description:
          'Trois jours entre oasis, dunes et nuit sous tente berbère. Transport depuis Tunis inclus.',
        language: 'fr',
        coverUrl: img('desert-escape'),
        startsAt: tunisDate(now, 35, '06:00'),
        endsAt: tunisDate(now, 37, '22:00'),
        city: 'Tozeur',
        location: { lng: 8.1335, lat: 33.9197 },
        capacity: 20,
        placesTaken: 11,
        registrationType: 'deposit',
        priceFromMillimes: dt(390),
        details: { difficulty: 2, distanceKm: 25 },
        publishedAt: now,
      },
      {
        slug: 'week-end-djerba',
        organizerProfileId: organizer('sahara-nomads').id,
        creatorId: user('karim').id,
        templateId: template('hiking_trip').id,
        categoryId: categoryId('outdoor'),
        model: 'group_trip',
        status: 'published',
        title: 'Week-end à Djerba',
        language: 'fr',
        coverUrl: img('djerba-getaway'),
        startsAt: tunisDate(now, 49, '08:00'),
        endsAt: tunisDate(now, 50, '20:00'),
        city: 'Djerba',
        location: { lng: 10.8575, lat: 33.8756 },
        capacity: 16,
        placesTaken: 5,
        registrationType: 'deposit',
        priceFromMillimes: dt(280),
        details: { difficulty: 1 },
        publishedAt: now,
      },
      {
        slug: 'soiree-stand-up-tunis',
        organizerProfileId: organizer('tunis-live').id,
        creatorId: user('leila').id,
        templateId: template('concert_party').id,
        categoryId: categoryId('entertainment'),
        model: 'ticketed',
        status: 'full',
        title: 'Soirée stand-up tunisien',
        language: 'fr',
        coverUrl: img('standup-night'),
        startsAt: tunisDate(now, 12, '20:30'),
        venueName: 'Espace culturel Lafayette',
        city: 'Tunis',
        location: { lng: 10.1815, lat: 36.8125 },
        minAge: 16,
        capacity: 120,
        placesTaken: 120,
        registrationType: 'paid',
        priceFromMillimes: dt(30),
        details: { genre: 'standup' },
        publishedAt: now,
      },
      // A past, completed event: must never appear in listings (spec section 4).
      {
        slug: 'randonnee-rtiba',
        organizerProfileId: organizer('kroumirie-trekkers').id,
        creatorId: user('sami').id,
        templateId: template('hiking_trip').id,
        categoryId: categoryId('outdoor'),
        model: 'group_trip',
        status: 'completed',
        title: 'Randonnée à Rtiba',
        language: 'fr',
        coverUrl: img('rtiba-hike'),
        startsAt: tunisDate(now, -60, '07:00'),
        city: 'Rtiba',
        location: { lng: 9.1, lat: 36.95 },
        capacity: 25,
        placesTaken: 22,
        registrationType: 'paid',
        priceFromMillimes: dt(60),
        details: { difficulty: 2 },
        publishedAt: tunisDate(now, -80, '12:00'),
      },
      // A draft: visible to its organizer only.
      {
        slug: 'kayak-bizerte-brouillon',
        organizerProfileId: organizer('kroumirie-trekkers').id,
        creatorId: user('sami').id,
        templateId: template('sports_session').id,
        categoryId: categoryId('sports'),
        model: 'ticketed',
        status: 'draft',
        title: 'Kayak au lac de Bizerte (brouillon)',
        language: 'fr',
        startsAt: tunisDate(now, 40, '09:00'),
        city: 'Bizerte',
        details: { sport: 'Kayak' },
      },
      // Private birthday (model C): never listed or indexed (TRS-06).
      {
        slug: 'les-30-ans-de-yasmine',
        creatorId: user('yasmine').id,
        templateId: template('birthday').id,
        categoryId: categoryId('celebrations'),
        model: 'private',
        status: 'published',
        visibility: 'private',
        title: 'Les 30 ans de Yasmine',
        description: 'Dîner sur le toit puis soirée dansante. Tenue : blanc et bleu !',
        language: 'fr',
        coverUrl: img('birthday-rooftop'),
        startsAt: tunisDate(now, 20, '19:30'),
        venueName: 'Dar Yasmina',
        city: 'Sidi Bou Saïd',
        locationHiddenUntilBooking: true,
        registrationType: 'free_rsvp',
        details: { guestOfHonour: 'Yasmine', theme: 'Blanc et bleu' },
        publishedAt: now,
      },
    ])
    .returning();
  const event = (slug: string) => eventRows.find((e) => e.slug === slug)!;

  await tx
    .insert(s.occurrences)
    .values(eventRows.map((e) => ({ eventId: e.id, startsAt: e.startsAt, endsAt: e.endsAt })));

  // --- Tickets (TKT-02), meeting points (LOG-01), programme and questions ------------
  const hike = event('randonnee-foret-ain-draham');
  const concert = event('live-music-night-la-marsa');
  const pottery = event('atelier-poterie-sidi-bou-said');

  const tickets = await tx
    .insert(s.ticketTypes)
    .values([
      {
        eventId: hike.id,
        name: 'Place + transport depuis Tunis',
        priceMillimes: dt(65),
        depositMillimes: dt(20),
        quantity: 30,
        sold: 18,
      },
      {
        eventId: concert.id,
        kind: 'early_bird',
        name: 'Early bird',
        priceMillimes: dt(35),
        quantity: 100,
        sold: 100,
        sort: 0,
      },
      {
        eventId: concert.id,
        name: 'Standard',
        priceMillimes: dt(45),
        quantity: 350,
        sold: 140,
        sort: 1,
      },
      {
        eventId: concert.id,
        kind: 'vip',
        name: 'VIP (front stage + drink)',
        priceMillimes: dt(90),
        quantity: 50,
        sold: 10,
        sort: 2,
      },
      {
        eventId: pottery.id,
        name: 'Atelier (2 pièces)',
        priceMillimes: dt(55),
        quantity: 12,
        sold: 9,
      },
      {
        eventId: pottery.id,
        kind: 'couple',
        name: 'Duo',
        priceMillimes: dt(100),
        seatsPerTicket: 2,
        quantity: 3,
        sold: 0,
        sort: 1,
      },
      ...eventRows
        .filter((e) => ![hike.id, concert.id, pottery.id].includes(e.id) && e.model !== 'private')
        .map((e) => ({
          eventId: e.id,
          name: e.priceFromMillimes ? 'Standard' : 'Entrée libre',
          priceMillimes: e.priceFromMillimes ?? 0,
          depositMillimes: e.registrationType === 'deposit' ? dt(100) : null,
          quantity: e.capacity,
          sold: e.placesTaken,
        })),
    ])
    .returning();

  const [bab, beja] = await tx
    .insert(s.meetingPoints)
    .values([
      {
        eventId: hike.id,
        name: 'Tunis — Bab Saadoun (station louage)',
        meetAt: tunisDate(now, sat, '04:30'),
        location: { lng: 10.1638, lat: 36.8061 },
        sort: 0,
      },
      {
        eventId: hike.id,
        name: 'Béja — Place de l’Indépendance',
        meetAt: tunisDate(now, sat, '06:00'),
        location: { lng: 9.1817, lat: 36.7256 },
        sort: 1,
      },
    ])
    .returning();

  await tx.insert(s.itinerarySteps).values([
    {
      eventId: hike.id,
      title: 'Départ du sentier, maison forestière',
      startsAt: tunisDate(now, sat, '08:30'),
      sort: 0,
    },
    {
      eventId: hike.id,
      title: 'Cascade d’Oued Zouaraa',
      startsAt: tunisDate(now, sat, '11:00'),
      sort: 1,
    },
    {
      eventId: hike.id,
      title: 'Déjeuner chez l’habitant',
      startsAt: tunisDate(now, sat, '13:00'),
      sort: 2,
    },
    {
      eventId: hike.id,
      title: 'Retour vers Tunis',
      startsAt: tunisDate(now, sat, '16:00'),
      sort: 3,
    },
  ]);

  await tx.insert(s.bookingQuestions).values([
    {
      eventId: hike.id,
      label: 'Niveau de randonnée',
      type: 'select',
      options: ['Débutant', 'Régulier', 'Confirmé'],
      required: true,
    },
    { eventId: hike.id, label: 'Allergies alimentaires', type: 'text' },
    { eventId: concert.id, label: 'T-shirt size', type: 'select', options: ['S', 'M', 'L', 'XL'] },
  ]);

  // --- Orders in every payment state (PRT-01, PRT-03, PAY-03, PAY-04) -----------------
  const hikeTicket = tickets.find((t) => t.eventId === hike.id)!;
  const vipTicket = tickets.find((t) => t.eventId === concert.id && t.kind === 'vip')!;

  const orderSpecs = [
    {
      buyer: 'omar',
      event: hike,
      ticket: hikeTicket,
      status: 'paid',
      paid: dt(65),
      point: bab,
      method: 'card',
      provider: 'mock',
      payment: 'succeeded',
      utm: { source: 'instagram' },
    },
    {
      buyer: 'ines',
      event: hike,
      ticket: hikeTicket,
      status: 'partially_paid',
      paid: dt(20),
      point: bab,
      method: 'd17',
      provider: 'manual',
      payment: 'pending',
      proof: true,
      utm: { source: 'whatsapp' },
    },
    {
      buyer: 'aziz',
      event: hike,
      ticket: hikeTicket,
      status: 'awaiting_payment',
      paid: 0,
      point: beja,
      method: 'cash',
      provider: 'manual',
      payment: 'pending',
      source: 'manual',
      utm: {},
    },
    {
      buyer: 'nour',
      event: hike,
      ticket: hikeTicket,
      status: 'refunded',
      paid: dt(65),
      point: bab,
      method: 'card',
      provider: 'mock',
      payment: 'refunded',
      refund: true,
      utm: { source: 'facebook' },
    },
    {
      buyer: 'yasmine',
      event: concert,
      ticket: vipTicket,
      status: 'paid',
      paid: dt(90),
      method: 'e_dinar',
      provider: 'mock',
      payment: 'succeeded',
      utm: { source: 'instagram', campaign: 'launch' },
    },
  ] as const;

  for (const spec of orderSpecs) {
    const buyer = user(spec.buyer);
    const [order] = await tx
      .insert(s.orders)
      .values({
        reference: orderReference(),
        buyerId: buyer.id,
        eventId: spec.event.id,
        source: 'source' in spec ? spec.source : 'online',
        status: spec.status,
        totalMillimes: spec.ticket.priceMillimes,
        paidMillimes: spec.status === 'refunded' ? 0 : spec.paid,
        balanceDueAt: spec.status === 'partially_paid' ? tunisDate(now, sat - 2, '20:00') : null,
        utm: spec.utm,
      })
      .returning();
    const [booking] = await tx
      .insert(s.bookings)
      .values({
        orderId: order!.id,
        eventId: spec.event.id,
        ticketTypeId: spec.ticket.id,
        meetingPointId: 'point' in spec ? spec.point!.id : null,
        status: spec.status === 'refunded' ? 'cancelled' : 'confirmed',
      })
      .returning();
    await tx.insert(s.attendees).values({
      bookingId: booking!.id,
      eventId: spec.event.id,
      userId: buyer.id,
      fullName: buyer.name,
      phone: buyer.phoneNumber,
      email: buyer.email,
      ticketCode: ticketCode(),
    });
    const amount =
      spec.paid > 0 ? spec.paid : (spec.ticket.depositMillimes ?? spec.ticket.priceMillimes);
    const [payment] = await tx
      .insert(s.payments)
      .values({
        orderId: order!.id,
        provider: spec.provider,
        method: spec.method,
        status: spec.payment,
        amountMillimes: amount,
        providerRef: spec.provider === 'mock' ? `mock_${order!.reference}` : null,
        paidAt: spec.payment === 'succeeded' || spec.payment === 'refunded' ? now : null,
      })
      .returning();
    if ('proof' in spec) {
      await tx.insert(s.paymentProofs).values({
        paymentId: payment!.id,
        uploadedById: buyer.id,
        fileKey: `proofs/demo/${order!.reference}.jpg`,
        note: 'Reçu D17',
      });
    }
    if ('refund' in spec) {
      await tx.insert(s.refunds).values({
        orderId: order!.id,
        paymentId: payment!.id,
        amountMillimes: spec.paid,
        reason: 'Annulation plus de 7 jours avant le départ (politique modérée).',
        status: 'processed',
        requestedById: buyer.id,
        approvedById: user('sami').id,
        processedAt: now,
      });
    }
  }

  // --- Private birthday: invitations and RSVPs (INV-02, INV-03) --------------------------
  const birthday = event('les-30-ans-de-yasmine');
  const invited = ['omar', 'ines', 'aziz', 'salma', 'mehdi'] as const;
  const invitationRows = await tx
    .insert(s.invitations)
    .values([
      ...invited.map((k) => ({
        eventId: birthday.id,
        invitedById: user('yasmine').id,
        inviteeUserId: user(k).id,
        channel: 'friend' as const,
        token: ticketCode(),
      })),
      {
        eventId: birthday.id,
        invitedById: user('yasmine').id,
        channel: 'link' as const,
        token: ticketCode(),
      },
    ])
    .returning();
  const rsvpStatus = {
    omar: 'going',
    ines: 'maybe',
    aziz: 'not_going',
    salma: 'seen',
    mehdi: 'going',
  } as const;
  await tx.insert(s.rsvps).values([
    ...invited.map((k, i) => ({
      eventId: birthday.id,
      userId: user(k).id,
      invitationId: invitationRows[i]!.id,
      status: rsvpStatus[k],
      plusOnes: k === 'omar' ? 1 : 0,
      respondedAt: rsvpStatus[k] === 'seen' ? null : now,
    })),
    {
      eventId: birthday.id,
      userId: guest!.id,
      invitationId: invitationRows.at(-1)!.id,
      guestName: 'Hana',
      status: 'going' as const,
      dietaryNotes: 'Végétarienne',
      respondedAt: now,
    },
  ]);

  // --- A little social graph for Phase 4 (SOC-01, SOC-02) ---------------------------------
  await tx.insert(s.friendships).values([
    {
      requesterId: user('yasmine').id,
      addresseeId: user('omar').id,
      status: 'accepted',
      respondedAt: now,
    },
    {
      requesterId: user('yasmine').id,
      addresseeId: user('ines').id,
      status: 'accepted',
      respondedAt: now,
    },
    {
      requesterId: user('omar').id,
      addresseeId: user('mehdi').id,
      status: 'accepted',
      respondedAt: now,
    },
    { requesterId: user('salma').id, addresseeId: user('yasmine').id, status: 'pending' },
  ]);
  await tx.insert(s.follows).values([
    {
      followerId: user('yasmine').id,
      targetType: 'organizer',
      targetId: organizer('tunis-live').id,
    },
    {
      followerId: user('omar').id,
      targetType: 'organizer',
      targetId: organizer('kroumirie-trekkers').id,
    },
    {
      followerId: user('ines').id,
      targetType: 'organizer',
      targetId: organizer('kroumirie-trekkers').id,
    },
  ]);

  return { events: eventRows.length, users: userRows.length + 1 };
}

const { db, pool } = createPoolDb(requireEnv('DATABASE_URL_UNPOOLED'));
try {
  const result = await db.transaction(async (tx) => {
    await wipe(tx);
    return seed(tx);
  });
  console.warn(
    `Seeded ${result.users} users and ${result.events} events on branch "${process.env.NEON_BRANCH ?? 'unknown'}".`,
  );
  console.warn('Sign in as admin with phone +21620000001 (the OTP appears in the dev outbox).');
} finally {
  await pool.end();
}
