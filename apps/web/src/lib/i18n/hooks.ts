"use client"

import { useTranslation as useI18nTranslation } from 'react-i18next'
import type {
    TranslationKey,
    InterpolationParams,
    TranslationFunction,
    CommonKeys,
    NavigationKeys,
    ComponentKeys,
    AuthKeys,
    PageKeys,
    FormKeys,
    ErrorKeys
} from './translations'

/**
 * Main translation hook with full type safety
 * Usage: const t = useTranslation()
 */
export function useTranslation(): {
    t: TranslationFunction
    isLoading: boolean
    language: string
} {
    const { t: i18nT, ready, i18n } = useI18nTranslation()

    const t: TranslationFunction = (key: TranslationKey, params?: InterpolationParams) => {
        // Handle namespace-prefixed keys by extracting namespace and key
        if (key.includes('.')) {
            const [namespace, ...keyParts] = key.split('.')
            const actualKey = keyParts.join('.')

            // Check if this is a valid namespace
            const validNamespaces = ['common', 'navigation', 'components', 'auth', 'pages', 'forms', 'errors']
            if (namespace && validNamespaces.includes(namespace)) {
                return i18nT(actualKey, { ...params, ns: namespace })
            }
        }

        // Fallback to default behavior
        return i18nT(key, params)
    }

    return {
        t,
        isLoading: !ready,
        language: i18n.language
    }
}

/**
 * Namespace-specific hooks for better organization and performance
 */

export function useCommonTranslation(): {
    t: (key: CommonKeys, params?: InterpolationParams) => string
    isLoading: boolean
} {
    const { t: i18nT, ready } = useI18nTranslation('common')

    const t = (key: CommonKeys, params?: InterpolationParams) => {
        return i18nT(key, params)
    }

    return { t, isLoading: !ready }
}

export function useNavigationTranslation(): {
    t: (key: NavigationKeys, params?: InterpolationParams) => string
    isLoading: boolean
} {
    const { t: i18nT, ready } = useI18nTranslation('navigation')

    const t = (key: NavigationKeys, params?: InterpolationParams) => {
        return i18nT(key, params)
    }

    return { t, isLoading: !ready }
}

export function useComponentTranslation(): {
    t: (key: ComponentKeys, params?: InterpolationParams) => string
    isLoading: boolean
} {
    const { t: i18nT, ready } = useI18nTranslation('components')

    const t = (key: ComponentKeys, params?: InterpolationParams) => {
        return i18nT(key, params)
    }

    return { t, isLoading: !ready }
}

export function useAuthTranslation(): {
    t: (key: AuthKeys, params?: InterpolationParams) => string
    isLoading: boolean
} {
    const { t: i18nT, ready } = useI18nTranslation('auth')

    const t = (key: AuthKeys, params?: InterpolationParams) => {
        return i18nT(key, params)
    }

    return { t, isLoading: !ready }
}

export function usePageTranslation(): {
    t: (key: PageKeys, params?: InterpolationParams) => string
    isLoading: boolean
} {
    const { t: i18nT, ready } = useI18nTranslation('pages')

    const t = (key: PageKeys, params?: InterpolationParams) => {
        return i18nT(key, params)
    }

    return { t, isLoading: !ready }
}

export function useFormTranslation(): {
    t: (key: FormKeys, params?: InterpolationParams) => string
    isLoading: boolean
} {
    const { t: i18nT, ready } = useI18nTranslation('forms')

    const t = (key: FormKeys, params?: InterpolationParams) => {
        return i18nT(key, params)
    }

    return { t, isLoading: !ready }
}

export function useErrorTranslation(): {
    t: (key: ErrorKeys, params?: InterpolationParams) => string
    isLoading: boolean
} {
    const { t: i18nT, ready } = useI18nTranslation('errors')

    const t = (key: ErrorKeys, params?: InterpolationParams) => {
        return i18nT(key, params)
    }

    return { t, isLoading: !ready }
}

/**
 * Utility hook for language switching
 */
export function useLanguageSwitcher() {
    const { i18n } = useI18nTranslation()

    const changeLanguage = async (language: string) => {
        await i18n.changeLanguage(language)
        // Persist language preference
        if (typeof window !== 'undefined') {
            localStorage.setItem('heistmind-language', language)
        }
    }

    return {
        currentLanguage: i18n.language,
        changeLanguage,
        supportedLanguages: ['en', 'es', 'fr', 'de'] as const
    }
}

/**
 * Hook for loading states during translation initialization
 */
export function useTranslationReady() {
    const { ready } = useI18nTranslation()
    return ready
}
