import {
  Baby,
  Briefcase,
  Heart,
  type LucideIcon,
  type LucideProps,
  Mountain,
  Music,
  Palette,
  PartyPopper,
  Sparkles,
  Volleyball,
} from 'lucide-react';

/** Icon names stored on categories (see packages/templates/src/categories.ts). */
const icons: Record<string, LucideIcon> = {
  mountain: Mountain,
  volleyball: Volleyball,
  music: Music,
  palette: Palette,
  'party-popper': PartyPopper,
  heart: Heart,
  briefcase: Briefcase,
  baby: Baby,
};

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = icons[name] ?? Sparkles;
  return <Icon aria-hidden="true" {...props} />;
}

/** Tailwind classes per category accent token (literal strings so Tailwind finds them). */
export const accentClasses: Record<string, { tile: string; icon: string }> = {
  outdoor: { tile: 'bg-cat-outdoor-bg text-cat-outdoor-fg', icon: 'text-cat-outdoor' },
  sports: { tile: 'bg-cat-sports-bg text-cat-sports-fg', icon: 'text-cat-sports' },
  entertainment: {
    tile: 'bg-cat-entertainment-bg text-cat-entertainment-fg',
    icon: 'text-cat-entertainment',
  },
  learning: { tile: 'bg-cat-learning-bg text-cat-learning-fg', icon: 'text-cat-learning' },
  celebrations: {
    tile: 'bg-cat-celebrations-bg text-cat-celebrations-fg',
    icon: 'text-cat-celebrations',
  },
  couples: { tile: 'bg-cat-couples-bg text-cat-couples-fg', icon: 'text-cat-couples' },
  corporate: { tile: 'bg-cat-corporate-bg text-cat-corporate-fg', icon: 'text-cat-corporate' },
  kids: { tile: 'bg-cat-kids-bg text-cat-kids-fg', icon: 'text-cat-kids' },
};

export function accentOf(accent: string) {
  return accentClasses[accent] ?? { tile: 'bg-muted text-foreground', icon: 'text-primary' };
}
