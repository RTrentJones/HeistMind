import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translations } from '@/lib/i18n/translations';

// Define supported languages
export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Default language
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// Initialize i18n SYNCHRONOUSLY. Every message file is bundled inline (no HTTP backend), and
// `initAsync: false` makes init() complete before this module finishes evaluating — so the very
// first render, on the server AND on the client, already has English loaded. That is what lets
// every page server-render its real copy with no client-side "wait for i18n" gate, and keeps the
// server HTML and the first client render byte-identical (no hydration mismatch). A saved
// non-English preference is applied after hydration (see ./provider.tsx).
void i18n.use(initReactI18next).init({
  resources: translations,
  initAsync: false,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false, // React already escapes by default
  },

  // Namespace configuration
  defaultNS: 'common',
  ns: ['common', 'components', 'pages', 'navigation', 'auth', 'forms', 'errors'],

  // Development settings
  debug: process.env.NODE_ENV === 'development',

  // React integration
  react: {
    useSuspense: false, // Disable suspense for SSR compatibility
  },

  // Key interpolation
  keySeparator: '.',
  nsSeparator: ':',

  // Pluralization
  pluralSeparator: '_',
  contextSeparator: '_',
});

export default i18n;
