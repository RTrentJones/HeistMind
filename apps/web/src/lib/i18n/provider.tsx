'use client';

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { TooltipProvider } from '@heist-mind/ui';
import i18n from '@/lib/i18n/';
import { LANGUAGE_STORAGE_KEY } from '@/lib/i18n/hooks';

interface I18nProviderProps {
  children: React.ReactNode;
}

/**
 * Mounts i18next for the client tree. The instance is initialized synchronously with the bundled
 * English resources (lib/i18n/index.ts), so children render immediately — on the server too, which
 * is what puts each page's real copy in the initial HTML. There is deliberately NO "is i18n ready?"
 * gate: one used to hold every route behind a client effect, so no page ever server-rendered.
 *
 * A saved language preference (written by `useLanguageSwitcher`) lives in localStorage, which only
 * exists in the browser; it is applied AFTER hydration so the first client render matches the
 * server's English HTML. `changeLanguage` then re-renders the translated tree.
 */
export function I18nProvider({ children }: I18nProviderProps) {
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch {
      // Storage blocked (private mode / disabled cookies) → stay on the default language.
    }
    if (saved && saved !== i18n.language && i18n.hasResourceBundle(saved, 'common')) {
      void i18n.changeLanguage(saved);
    }
  }, []);

  // TooltipProvider (Radix) must wrap the app so tooltip-bearing components — e.g. the
  // StressTracker dot allocator used in the character wizard's Attributes step — can render
  // without throwing "`Tooltip` must be used within `TooltipProvider`". Kept here (a client
  // boundary) rather than the server root layout, where Radix's hook-using Provider can't go.
  return (
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>{children}</TooltipProvider>
    </I18nextProvider>
  );
}
