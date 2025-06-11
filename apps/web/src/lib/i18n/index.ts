import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { translations } from './translations'

// Define supported languages
export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de'] as const
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]

// Default language
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en'

// Initialize i18n
i18n
    .use(initReactI18next)
    .init({
        resources: translations,
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
    })

export default i18n
