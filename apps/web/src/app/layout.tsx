import { defaultLocale, getDirection } from '@doulisha/i18n';
import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Doulisha',
  description: 'Discover, organize and share events and activities in Tunisia.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  // Locale routing arrives in Phase 1 (next-intl); until then use the default locale.
  return (
    <html lang={defaultLocale} dir={getDirection(defaultLocale)} className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
