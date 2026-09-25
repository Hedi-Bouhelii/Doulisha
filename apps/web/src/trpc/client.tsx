'use client';

import type { AppRouter } from '@doulisha/api';
import { isServer, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import { useLocale } from 'next-intl';
import { useState, type ReactNode } from 'react';
import superjson from 'superjson';

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // Polling instead of realtime in the MVP (ADR 0002); data stays fresh 30 s.
      queries: { staleTime: 30_000, refetchOnWindowFocus: false },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

/** tRPC + TanStack Query for client components. Sends the page locale to the API. */
export function TRPCReactProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
          headers: () => ({ 'x-doulisha-locale': locale }),
        }),
      ],
    }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
