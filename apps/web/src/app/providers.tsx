'use client';

import { ThemeProvider } from '@heist-mind/ui';
import { I18nProvider } from '@/lib/i18n/provider';

/**
 * Client-side provider stack for the whole app. Lives behind a `'use client'` boundary so the
 * design-system barrel (`@heist-mind/ui`, which re-exports client hooks like `useDebounce`) is
 * never pulled into the server component graph — importing it directly in the server `layout.tsx`
 * breaks the build.
 *
 * `ThemeProvider` (defaults to the dark heist palette) is the new addition that makes the light
 * theme + the language/theme toggles reachable. It wraps `I18nProvider`, which already mounts the
 * Radix `TooltipProvider` the app's tooltip-bearing components rely on.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultMode='dark'>
      <I18nProvider>{children}</I18nProvider>
    </ThemeProvider>
  );
}
