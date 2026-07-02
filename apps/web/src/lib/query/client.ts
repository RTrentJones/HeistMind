import { QueryClient } from '@tanstack/react-query';
import type { RepositoryError } from './result';

// Every queryFn/mutationFn in the seam throws RepositoryError (via unwrap), so register it as THE
// error type — components read `query.error.message`/`.code` without casts.
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: RepositoryError;
  }
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Load-on-view is intentional (no realtime); keep data briefly fresh + retry once.
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * The app's QueryClient. In the browser this is a singleton shared by the provider tree AND the
 * seam's non-hook surfaces (`features/{concept}/data/api.ts`, called from Zustand store actions),
 * so their invalidations hit the same cache the hooks read from. On the server every call returns
 * a fresh client — never share a cache across requests.
 */
export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') return makeQueryClient();
  return (browserQueryClient ??= makeQueryClient());
}
