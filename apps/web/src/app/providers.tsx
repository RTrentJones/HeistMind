'use client';

import { ThemeProvider, TooltipProvider } from '@heist-mind/ui';
import { I18nProvider } from '@/lib/i18n/provider';

/**
 * Client-side provider stack for the whole app. Lives behind a `'use client'` boundary so the
 * design-system barrel (`@heist-mind/ui`, which re-exports client hooks like `useDebounce`) is
 * never pulled into the server component graph — importing it directly in the server `layout.tsx`
 * breaks the build. `ThemeProvider` enables the light/dark toggle (defaults to the dark heist
 * palette); `TooltipProvider` is required for the DS `Tooltip` help text used across the app.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider defaultMode='dark'>
        <TooltipProvider>{children}</TooltipProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
