import { Globe } from 'lucide-react';
import type { SVGProps } from 'react';

/**
 * Simple marks for social links, drawn from basic shapes (lucide no longer
 * ships brand icons). Decorative: the link text or aria-label names the network.
 */
type IconProps = SVGProps<SVGSVGElement>;

export function FacebookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <path
        d="M13.4 19v-6h2l.3-2.4h-2.3V9.2c0-.7.2-1.1 1.2-1.1h1.2V6a15 15 0 0 0-1.8-.1c-1.8 0-3 1.1-3 3.1v1.6H9v2.4h2V19Z"
        fill="var(--card, #fff)"
      />
    </svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TikTokIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 3c.5 2.6 2.4 4.3 5 4.5" />
    </svg>
  );
}

export const socialNetworks = [
  { key: 'facebook', label: 'Facebook', Icon: FacebookIcon },
  { key: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { key: 'tiktok', label: 'TikTok', Icon: TikTokIcon },
  { key: 'website', label: 'Web', Icon: Globe },
] as const;
