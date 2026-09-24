import type { TemplateDefinition } from './types';

// Arabic labels below need review by a native speaker. TODO(i18n-review)

/** Spec 6.2 "Hiking trip": model B, difficulty 1–5, distance, elevation, GPX, meeting points. */
const hikingTrip: TemplateDefinition = {
  key: 'hiking_trip',
  categorySlug: 'outdoor',
  model: 'group_trip',
  name: { ar: 'رحلة مشي', fr: 'Randonnée', en: 'Hiking trip' },
  isActive: true,
  definition: {
    fields: [
      {
        key: 'difficulty',
        type: 'number',
        min: 1,
        max: 5,
        step: 1,
        required: true,
        label: { ar: 'مستوى الصعوبة', fr: 'Difficulté', en: 'Difficulty' },
      },
      {
        key: 'distanceKm',
        type: 'number',
        min: 0,
        max: 200,
        step: 0.5,
        unit: 'km',
        label: { ar: 'المسافة', fr: 'Distance', en: 'Distance' },
      },
      {
        key: 'elevationM',
        type: 'number',
        min: 0,
        max: 5000,
        step: 10,
        unit: 'm',
        label: { ar: 'الارتفاع', fr: 'Dénivelé', en: 'Elevation gain' },
      },
      {
        key: 'gpxMediaId',
        type: 'gpx',
        label: { ar: 'مسار GPX', fr: 'Trace GPX', en: 'GPX track' },
      },
    ],
    defaultBrief: {
      whatToBring: [
        { ar: 'حذاء مشي', fr: 'Chaussures de randonnée', en: 'Hiking shoes' },
        { ar: 'ماء (2 لتر)', fr: 'Eau (2 litres)', en: 'Water (2 litres)' },
        { ar: 'سترة واقية من المطر', fr: 'Coupe-vent', en: 'Rain jacket' },
      ],
      safety: {
        ar: 'ابقَ مع المجموعة واتبع تعليمات المرشد.',
        fr: 'Restez avec le groupe et suivez les consignes du guide.',
        en: 'Stay with the group and follow the guide’s instructions.',
      },
    },
    cancellationPolicy: 'moderate',
    registrationTypes: ['paid', 'deposit', 'pay_at_door', 'free_rsvp'],
    modules: [
      'tickets',
      'payments',
      'attendees',
      'checkin',
      'waitlist',
      'itinerary',
      'meeting_points',
    ],
    searchFilters: ['difficulty'],
    shareStyle: { accent: 'outdoor', layout: 'photo' },
    defaultVisibility: 'public',
  },
};

/** Spec 6.2 "Concert / party": model A, ticket types, 18+ age limit, lineup, door check-in. */
const concertParty: TemplateDefinition = {
  key: 'concert_party',
  categorySlug: 'entertainment',
  model: 'ticketed',
  name: { ar: 'حفلة موسيقية', fr: 'Concert / soirée', en: 'Concert / party' },
  isActive: true,
  definition: {
    fields: [
      {
        key: 'lineup',
        type: 'text',
        maxLength: 500,
        multiline: true,
        label: { ar: 'الفنانون', fr: 'Programmation', en: 'Lineup' },
      },
      {
        key: 'genre',
        type: 'select',
        options: [
          { value: 'live', label: { ar: 'موسيقى حية', fr: 'Live', en: 'Live music' } },
          { value: 'dj', label: { ar: 'دي جي', fr: 'DJ set', en: 'DJ set' } },
          { value: 'traditional', label: { ar: 'تراثي', fr: 'Traditionnel', en: 'Traditional' } },
          { value: 'standup', label: { ar: 'ستاند أب', fr: 'Stand-up', en: 'Stand-up' } },
        ],
        label: { ar: 'النوع', fr: 'Genre', en: 'Genre' },
      },
    ],
    defaultBrief: {
      rules: {
        ar: 'بطاقة الهوية مطلوبة عند الدخول.',
        fr: 'Pièce d’identité demandée à l’entrée.',
        en: 'ID required at the door.',
      },
    },
    cancellationPolicy: 'strict',
    registrationTypes: ['paid', 'free_rsvp', 'pay_at_door'],
    modules: ['tickets', 'payments', 'attendees', 'checkin', 'waitlist'],
    searchFilters: ['genre'],
    shareStyle: { accent: 'entertainment', layout: 'poster' },
    defaultVisibility: 'public',
  },
};

/** Spec 6.2 "Workshop / class": model A, sessions, level, materials included. */
const workshopClass: TemplateDefinition = {
  key: 'workshop_class',
  categorySlug: 'learning',
  model: 'ticketed',
  name: { ar: 'ورشة', fr: 'Atelier / cours', en: 'Workshop / class' },
  isActive: true,
  definition: {
    fields: [
      {
        key: 'level',
        type: 'select',
        required: true,
        options: [
          { value: 'beginner', label: { ar: 'مبتدئ', fr: 'Débutant', en: 'Beginner' } },
          {
            value: 'intermediate',
            label: { ar: 'متوسط', fr: 'Intermédiaire', en: 'Intermediate' },
          },
          { value: 'advanced', label: { ar: 'متقدم', fr: 'Avancé', en: 'Advanced' } },
        ],
        label: { ar: 'المستوى', fr: 'Niveau', en: 'Level' },
      },
      {
        key: 'materialsIncluded',
        type: 'boolean',
        label: { ar: 'المواد متوفرة', fr: 'Matériel fourni', en: 'Materials included' },
      },
      {
        key: 'sessions',
        type: 'number',
        min: 1,
        max: 52,
        step: 1,
        label: { ar: 'عدد الحصص', fr: 'Nombre de séances', en: 'Number of sessions' },
      },
    ],
    defaultBrief: {
      whatToBring: [{ ar: 'ملابس مريحة', fr: 'Tenue confortable', en: 'Comfortable clothes' }],
    },
    cancellationPolicy: 'flexible',
    registrationTypes: ['paid', 'free_rsvp', 'deposit'],
    modules: ['tickets', 'payments', 'attendees', 'checkin', 'waitlist'],
    searchFilters: ['level'],
    shareStyle: { accent: 'learning', layout: 'photo' },
    defaultVisibility: 'public',
  },
};

/** Model A sport sessions such as runs or yoga classes (spec 6.1 examples). */
const sportsSession: TemplateDefinition = {
  key: 'sports_session',
  categorySlug: 'sports',
  model: 'ticketed',
  name: { ar: 'نشاط رياضي', fr: 'Séance sportive', en: 'Sports session' },
  isActive: true,
  definition: {
    fields: [
      {
        key: 'sport',
        type: 'text',
        maxLength: 60,
        required: true,
        label: { ar: 'الرياضة', fr: 'Sport', en: 'Sport' },
      },
      {
        key: 'level',
        type: 'select',
        options: [
          { value: 'all', label: { ar: 'كل المستويات', fr: 'Tous niveaux', en: 'All levels' } },
          { value: 'beginner', label: { ar: 'مبتدئ', fr: 'Débutant', en: 'Beginner' } },
          { value: 'advanced', label: { ar: 'متقدم', fr: 'Confirmé', en: 'Advanced' } },
        ],
        label: { ar: 'المستوى', fr: 'Niveau', en: 'Level' },
      },
    ],
    defaultBrief: {
      whatToBring: [
        { ar: 'ملابس رياضية', fr: 'Tenue de sport', en: 'Sportswear' },
        { ar: 'ماء', fr: 'Eau', en: 'Water' },
      ],
    },
    cancellationPolicy: 'flexible',
    registrationTypes: ['free_rsvp', 'paid', 'pay_at_door'],
    modules: ['tickets', 'payments', 'attendees', 'checkin', 'waitlist'],
    searchFilters: ['level'],
    shareStyle: { accent: 'sports', layout: 'photo' },
    defaultVisibility: 'public',
  },
};

/** Spec 6.2 "Birthday": model C, guest of honour, theme, guest list and RSVP. */
const birthday: TemplateDefinition = {
  key: 'birthday',
  categorySlug: 'celebrations',
  model: 'private',
  name: { ar: 'عيد ميلاد', fr: 'Anniversaire', en: 'Birthday' },
  isActive: true,
  definition: {
    fields: [
      {
        key: 'guestOfHonour',
        type: 'text',
        maxLength: 80,
        label: { ar: 'صاحب المناسبة', fr: 'Invité d’honneur', en: 'Guest of honour' },
      },
      {
        key: 'theme',
        type: 'text',
        maxLength: 80,
        label: { ar: 'الموضوع', fr: 'Thème', en: 'Theme' },
      },
    ],
    defaultBrief: {},
    cancellationPolicy: 'flexible',
    registrationTypes: ['free_rsvp'],
    modules: ['invitations', 'rsvp'],
    searchFilters: [],
    shareStyle: { accent: 'celebrations', layout: 'invitation' },
    defaultVisibility: 'private',
  },
};

/** Any other private gathering (dinner at home, farewell, graduation). */
const privateGathering: TemplateDefinition = {
  key: 'private_gathering',
  categorySlug: 'celebrations',
  model: 'private',
  name: { ar: 'لقاء خاص', fr: 'Rencontre privée', en: 'Private gathering' },
  isActive: true,
  definition: {
    fields: [],
    defaultBrief: {},
    cancellationPolicy: 'flexible',
    registrationTypes: ['free_rsvp'],
    modules: ['invitations', 'rsvp'],
    searchFilters: [],
    shareStyle: { accent: 'celebrations', layout: 'invitation' },
    defaultVisibility: 'private',
  },
};

// --- V1 templates: defined so the engine stays generic, inactive until V1 ------

/** Spec 6.2 "Padel match": model D, venue and court, level range, 4 players. */
const padelMatch: TemplateDefinition = {
  key: 'padel_match',
  categorySlug: 'sports',
  model: 'slot_booking',
  name: { ar: 'مباراة بادل', fr: 'Match de padel', en: 'Padel match' },
  isActive: false,
  definition: {
    fields: [
      {
        key: 'levelMin',
        type: 'number',
        min: 1,
        max: 7,
        step: 0.5,
        label: { ar: 'أدنى مستوى', fr: 'Niveau min.', en: 'Min. level' },
      },
      {
        key: 'levelMax',
        type: 'number',
        min: 1,
        max: 7,
        step: 0.5,
        label: { ar: 'أعلى مستوى', fr: 'Niveau max.', en: 'Max. level' },
      },
    ],
    defaultBrief: {},
    cancellationPolicy: 'moderate',
    registrationTypes: ['paid'],
    modules: ['slots', 'payments'],
    searchFilters: ['levelMin', 'levelMax'],
    shareStyle: { accent: 'sports', layout: 'photo' },
    defaultVisibility: 'public',
  },
};

/** Spec 6.2 "Date night / couples": packages for 2, add-ons, discreet notifications. */
const dateNight: TemplateDefinition = {
  key: 'date_night',
  categorySlug: 'couples',
  model: 'slot_booking',
  name: { ar: 'سهرة لشخصين', fr: 'Soirée en amoureux', en: 'Date night' },
  isActive: false,
  definition: {
    fields: [
      {
        key: 'surpriseMode',
        type: 'boolean',
        label: { ar: 'مفاجأة', fr: 'Mode surprise', en: 'Surprise mode' },
      },
    ],
    defaultBrief: {},
    cancellationPolicy: 'moderate',
    registrationTypes: ['paid', 'deposit'],
    modules: ['slots', 'payments', 'providers'],
    searchFilters: [],
    shareStyle: { accent: 'couples', layout: 'invitation' },
    defaultVisibility: 'unlisted',
  },
};

/** Spec 6.2 "Team building": model C or B on quote, headcount and budget. */
const teamBuilding: TemplateDefinition = {
  key: 'team_building',
  categorySlug: 'corporate',
  model: 'private',
  name: { ar: 'نشاط جماعي للشركات', fr: 'Team building', en: 'Team building' },
  isActive: false,
  definition: {
    fields: [
      {
        key: 'company',
        type: 'text',
        maxLength: 120,
        required: true,
        label: { ar: 'الشركة', fr: 'Entreprise', en: 'Company' },
      },
      {
        key: 'headcount',
        type: 'number',
        min: 2,
        max: 2000,
        step: 1,
        required: true,
        label: { ar: 'عدد المشاركين', fr: 'Effectif', en: 'Headcount' },
      },
      {
        key: 'budgetTnd',
        type: 'number',
        min: 0,
        step: 50,
        unit: 'TND',
        label: { ar: 'الميزانية', fr: 'Budget', en: 'Budget' },
      },
    ],
    defaultBrief: {},
    cancellationPolicy: 'moderate',
    registrationTypes: ['free_rsvp'],
    modules: ['invitations', 'rsvp', 'providers'],
    searchFilters: [],
    shareStyle: { accent: 'corporate', layout: 'photo' },
    defaultVisibility: 'private',
  },
};

export const templateDefinitions: TemplateDefinition[] = [
  hikingTrip,
  concertParty,
  workshopClass,
  sportsSession,
  birthday,
  privateGathering,
  padelMatch,
  dateNight,
  teamBuilding,
];
