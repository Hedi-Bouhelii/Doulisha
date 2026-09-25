import { appRouter, createContext } from '@doulisha/api';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import { getAuth } from '@/server/auth';
import { getDb } from '@/server/db';
import { getServiceDeps } from '@/server/deps';

function handler(request: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: () =>
      createContext({
        db: getDb(),
        auth: getAuth(),
        headers: request.headers,
        deps: getServiceDeps(),
      }),
    onError({ error, path }) {
      if (error.code === 'INTERNAL_SERVER_ERROR')
        console.error(`tRPC ${path}:`, error.cause ?? error);
    },
  });
}

export { handler as GET, handler as POST };
