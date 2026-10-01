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
  /** Warm off-white for cards and inputs: never pure white on cream (design system v2). */
  surface: '#FFFCF7',
  sand: '#E8DCC8',
  sandLight: '#F0E8DA',
  brown: '#8B5E3C',
  ink: '#2A2420',
  white: '#FFFFFF',
  /** Deep enough for text on cream and on its soft tint (WCAG AA). */
  success: '#276F45',
  warning: '#8A5A00',
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
  /** Tints behind status text (badges, banners): the matching colour reads on them. */
  primarySoft: string;
  destructive: string;
  destructiveForeground: string;
  destructiveSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  border: string;
  input: string;
  ring: string;
}

export const themes: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    background: palette.cream,
    foreground: palette.ink,
    card: palette.surface,
    cardForeground: palette.ink,
    popover: palette.surface,
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
    primarySoft: '#E4EDDC',
    destructive: palette.danger,
    destructiveForeground: palette.white,
    destructiveSoft: '#FBE3E0',
    success: palette.success,
    successSoft: '#E0F0E5',
    warning: palette.warning,
    warningSoft: '#FBEBC8',
    info: '#2B5C8A',
    infoSoft: '#E1EBF5',
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
    primarySoft: '#1E3320',
    destructive: '#F2766B',
    destructiveForeground: '#1F0806',
    destructiveSoft: '#3D1916',
    success: '#6FCF97',
    successSoft: '#15301F',
    warning: '#E5B454',
    warningSoft: '#3A2D12',
    info: '#8DB9E3',
    infoSoft: '#15283B',
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

/**
 * Corner radii, smallest to largest (design system v2): chips and small
 * controls `sm`–`lg`, inputs `xl`, cards `2xl`, hero images, dialogs and the
 * booking card `3xl`, buttons and badges `full`.
 */
export const radii = {
  sm: '0.5rem',
  md: '0.625rem',
  lg: '0.75rem',
  xl: '0.875rem',
  '2xl': '1.25rem',
  '3xl': '1.75rem',
  full: '9999px',
} as const;

/**
 * Soft, warm-tinted shadows per theme: `card` for resting surfaces, `raised`
 * for hover and sticky panels, `overlay` for menus, dialogs and sheets.
 */
export const elevations = {
  light: {
    xs: '0 1px 2px rgb(42 36 32 / 0.05)',
    card: '0 1px 2px rgb(42 36 32 / 0.04), 0 6px 20px -8px rgb(42 36 32 / 0.10)',
    raised: '0 2px 6px rgb(42 36 32 / 0.06), 0 16px 36px -12px rgb(42 36 32 / 0.18)',
    overlay: '0 24px 64px -16px rgb(42 36 32 / 0.28)',
  },
  dark: {
    xs: '0 1px 2px rgb(0 0 0 / 0.4)',
    card: '0 1px 2px rgb(0 0 0 / 0.3), 0 6px 20px -8px rgb(0 0 0 / 0.5)',
    raised: '0 2px 6px rgb(0 0 0 / 0.35), 0 16px 36px -12px rgb(0 0 0 / 0.6)',
    overlay: '0 24px 64px -16px rgb(0 0 0 / 0.7)',
  },
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
