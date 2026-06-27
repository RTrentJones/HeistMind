'use client';

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Section, Stack, StatusIcon, Text, TooltipProvider } from '@heist-mind/ui';
import i18n from '@/lib/i18n/';

interface I18nProviderProps {
  children: React.ReactNode;
  initialLanguage?: string;
}

export function I18nProvider({ children, initialLanguage }: I18nProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeI18n = async () => {
      // Get language preference from localStorage or use initial language
      const savedLanguage =
        typeof window !== 'undefined' ? localStorage.getItem('heistmind-language') : null;

      const language = savedLanguage || initialLanguage || 'en';

      // Change language if different from current
      if (i18n.language !== language) {
        await i18n.changeLanguage(language);
      }

      setIsInitialized(true);
    };

    initializeI18n();
  }, [initialLanguage]);

  // Show loading until i18n is initialized
  if (!isInitialized) {
    return (
      <Section variant='hero' padding='none' width='full' className='min-h-screen'>
        <Stack justify='center' align='center' className='min-h-screen'>
          <Stack gap='md' align='center'>
            <StatusIcon status='loading' size='xl' icon='⚡' animation='pulse' />
            {/* Rendered before <I18nextProvider> mounts, so read off the i18n instance directly
                (initialized to English) rather than the useTranslation hook. */}
            <Text variant='secondary'>{i18n.t('common.loading.preparingShadows')}</Text>
          </Stack>
        </Stack>
      </Section>
    );
  }

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
