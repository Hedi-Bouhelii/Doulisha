/**
 * Doulisha design tokens, from the founder's UI template (2026-09-24):
 * Forest Green #2D5A27, Terracotta #C2622D, Cream #F5F0E8, Brown #8B5E3C, Sand #E8DCC8;
 * Playfair Display for headlines and Inter for body text (docs/UX_GUIDELINES.md).
 */

export const palette = {
  forest: '#2D5A27',
  forestDark: '#22461E',
  forestLight: '#E3EDDF',
  terracotta: '#C2622D',
  /** Terracotta dark enough for text and buttons (WCAG AA on cream and with white). */
  terracottaStrong: '#A64E1F',
  terracottaLight: '#F6E4D8',
  cream: '#F5F0E8',
  sand: '#E8DCC8',
  sandLight: '#F0E8DA',
  brown: '#8B5E3C',
  ink: '#2A2420',
  white: '#FFFFFF',
  success: '#2E7D4F',
  warning: '#9A6700',
  danger: '#B42318',
} as const;

/** Semantic colours. Names follow shadcn/ui so its components work unchanged. */
export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  /** shadcn "accent" is the subtle hover background, not the brand terracotta. */
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  /** Brand terracotta for badges, highlights and the secondary CTA. */
  highlight: string;
  highlightForeground: string;
  highlightSoft: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  warning: string;
  border: string;
  input: string;
  ring: string;
}

export const themes: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    background: palette.cream,
    foreground: palette.ink,
    card: palette.white,
    cardForeground: palette.ink,
    popover: palette.white,
    popoverForeground: palette.ink,
    primary: palette.forest,
    primaryForeground: palette.white,
    secondary: palette.sand,
    secondaryForeground: palette.ink,
    accent: palette.sandLight,
    accentForeground: palette.ink,
    muted: palette.sandLight,
    mutedForeground: palette.brown,
    highlight: palette.terracottaStrong,
    highlightForeground: palette.white,
    highlightSoft: palette.terracottaLight,
    destructive: palette.danger,
    destructiveForeground: palette.white,
    success: palette.success,
    warning: palette.warning,
    border: palette.sand,
    input: '#D9CBB3',
    ring: palette.forest,
  },
  dark: {
    background: '#15120F',
    foreground: palette.cream,
    card: '#1F1B17',
    cardForeground: palette.cream,
    popover: '#1F1B17',
    popoverForeground: palette.cream,
    primary: '#7DB36E',
    primaryForeground: '#10200D',
    secondary: '#2E2822',
    secondaryForeground: palette.cream,
    accent: '#2A241F',
    accentForeground: palette.cream,
    muted: '#26211C',
    mutedForeground: '#C9B79E',
    highlight: '#E08A55',
    highlightForeground: '#1E0F05',
    highlightSoft: '#3A2518',
    destructive: '#F2766B',
    destructiveForeground: '#1F0806',
    success: '#6FCF97',
    warning: '#E5B454',
    border: '#3A332C',
    input: '#4A4138',
    ring: '#7DB36E',
  },
};

/**
 * One accent per category (spec 1.3) so Doulisha does not look outdoor-only.
 * `fg` is readable on `bg` (tile backgrounds) and `solid` works as an icon colour.
 */
export const categoryAccents = {
  outdoor: { solid: '#2D5A27', bg: '#E3EDDF', fg: '#22461E' },
  sports: { solid: '#2F66B0', bg: '#E1EBF7', fg: '#1F4A85' },
  entertainment: { solid: '#C23B4E', bg: '#F8E1E4', fg: '#8E2536' },
  learning: { solid: '#C2622D', bg: '#F6E4D8', fg: '#8C4218' },
  celebrations: { solid: '#B5487A', bg: '#F5E0EA', fg: '#842F57' },
  couples: { solid: '#C0506A', bg: '#F7E2E7', fg: '#8B3047' },
  corporate: { solid: '#4A5A6A', bg: '#E4E8EC', fg: '#33404D' },
  kids: { solid: '#2E8C80', bg: '#DDF1EE', fg: '#1E6259' },
} as const;

export type CategoryAccent = keyof typeof categoryAccents;

export const radii = {
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.25rem',
  full: '9999px',
} as const;

/** Font families (loaded by the app; these are the family names). */
export const fonts = {
  display: 'Playfair Display',
  sans: 'Inter',
  arabic: 'IBM Plex Sans Arabic',
  arabicDisplay: 'Amiri',
} as const;

/** Motion: short and purposeful (UX_GUIDELINES.md). */
export const motion = {
  fast: '150ms',
  base: '200ms',
  slow: '250ms',
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;
