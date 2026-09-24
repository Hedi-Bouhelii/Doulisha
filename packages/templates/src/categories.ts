import type { CategoryDefinition } from './types';

/**
 * Categories from spec section 1.3. Arabic names need review by a native speaker.
 * TODO(i18n-review)
 */
export const categories: CategoryDefinition[] = [
  {
    slug: 'outdoor',
    name: { ar: 'رحلات وطبيعة', fr: 'Sorties et nature', en: 'Trips & outdoor' },
    icon: 'mountain',
    accent: 'outdoor',
    sort: 1,
  },
  {
    slug: 'sports',
    name: { ar: 'رياضة وأنشطة', fr: 'Sports et activités', en: 'Sports & activities' },
    icon: 'volleyball',
    accent: 'sports',
    sort: 2,
  },
  {
    slug: 'entertainment',
    name: { ar: 'حفلات وسهرات', fr: 'Concerts et soirées', en: 'Concerts & parties' },
    icon: 'music',
    accent: 'entertainment',
    sort: 3,
  },
  {
    slug: 'learning',
    name: { ar: 'ورشات وتعلّم', fr: 'Ateliers et cours', en: 'Workshops & classes' },
    icon: 'palette',
    accent: 'learning',
    sort: 4,
  },
  {
    slug: 'celebrations',
    name: { ar: 'مناسبات خاصة', fr: 'Fêtes privées', en: 'Private celebrations' },
    icon: 'party-popper',
    accent: 'celebrations',
    sort: 5,
  },
  {
    slug: 'couples',
    name: { ar: 'تجارب للثنائي', fr: 'Expériences en couple', en: 'Couples experiences' },
    icon: 'heart',
    accent: 'couples',
    sort: 6,
  },
  {
    slug: 'corporate',
    name: { ar: 'شركات ومجموعات', fr: 'Entreprises et groupes', en: 'Corporate & groups' },
    icon: 'briefcase',
    accent: 'corporate',
    sort: 7,
  },
  {
    slug: 'kids',
    name: { ar: 'أطفال وعائلة', fr: 'Enfants et famille', en: 'Kids & family' },
    icon: 'baby',
    accent: 'kids',
    sort: 8,
  },
];
