'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@heist-mind/ui';
import { I18nProvider } from '@/lib/i18n/provider';

/**
 * Client-side provider stack for the whole app. Lives behind a `'use client'` boundary so the
 * design-system barrel (`@heist-mind/ui`, which re-exports client hooks like `useDebounce`) is
 * never pulled into the server component graph — importing it directly in the server `layout.tsx`
 * breaks the build.
 *
 * `QueryClientProvider` (outermost) is the server-state foundation: every read/write goes through
 * the per-concept `features/{concept}/data/` React Query hooks (the single client data-access seam).
 * `ThemeProvider` (dark heist palette) wraps `I18nProvider`, which mounts the Radix `TooltipProvider`
 * the app's tooltip-bearing components rely on.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // One client per app instance (created lazily so it's stable across renders, fresh per request).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Load-on-view is intentional (no realtime); keep data briefly fresh + retry once.
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultMode='dark'>
        <I18nProvider>{children}</I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
