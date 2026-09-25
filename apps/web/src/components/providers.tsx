'use client';

import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

import { Toaster } from '@/components/ui/sonner';
import { TRPCReactProvider } from '@/trpc/client';

/** Client-side providers: light/dark theme, tRPC + TanStack Query, toasts. */
export function Providers({ children, dir }: { children: ReactNode; dir: 'ltr' | 'rtl' }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TRPCReactProvider>
        {children}
        <Toaster position={dir === 'rtl' ? 'bottom-left' : 'bottom-right'} dir={dir} />
      </TRPCReactProvider>
    </ThemeProvider>
  );
}
