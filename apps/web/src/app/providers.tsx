'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@heist-mind/ui';
import { getQueryClient } from '@/lib/query/client';
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
  // The shared client from lib/query/client — a browser singleton (stable across renders) so the
  // seam's non-hook surfaces (Zustand store actions) invalidate the same cache; fresh per request
  // on the server.
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultMode='dark'>
        <I18nProvider>{children}</I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
