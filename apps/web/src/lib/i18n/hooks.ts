'use client';

import { useCallback } from 'react';
import { useTranslation as useI18nTranslation } from 'react-i18next';
import { AVAILABLE_LANGUAGES } from '@/lib/i18n/translations';
import type {
  TranslationKey,
  InterpolationParams,
  TranslationFunction,
  ComponentKeys,
  AuthKeys,
  PageKeys,
} from '@/lib/i18n/translations';

/**
 * Main translation hook with full type safety
 * Usage: const t = useTranslation()
 */
export function useTranslation(): {
  t: TranslationFunction;
  isLoading: boolean;
  language: string;
} {
  const { t: i18nT, ready, i18n } = useI18nTranslation();

  // Memoized so `t` keeps a stable identity across renders (react-i18next's `i18nT` is stable until
  // the language changes). Without this, passing `t` into a useEffect/useCallback dependency array
  // re-runs the effect every render — which caused data-fetch loops on pages that load on view.
  const t: TranslationFunction = useCallback(
    (key: TranslationKey, params?: InterpolationParams) => {
      // Handle namespace-prefixed keys by extracting namespace and key
      if (key.includes('.')) {
        const [namespace, ...keyParts] = key.split('.');
        const actualKey = keyParts.join('.');

        // Check if this is a valid namespace
        const validNamespaces = [
          'common',
          'navigation',
          'components',
          'auth',
          'pages',
          'forms',
          'errors',
        ];
        if (namespace && validNamespaces.includes(namespace)) {
          return i18nT(actualKey, { ...params, ns: namespace });
        }
      }

      // Fallback to default behavior
      return i18nT(key, params);
    },
    [i18nT]
  );

  return {
    t,
    isLoading: !ready,
    language: i18n.language,
  };
}

/**
 * Namespace-specific hooks for better organization and performance
 */

export function useComponentTranslation(): {
  t: (key: ComponentKeys, params?: InterpolationParams) => string;
  isLoading: boolean;
} {
  const { t: i18nT, ready } = useI18nTranslation('components');

  const t = useCallback(
    (key: ComponentKeys, params?: InterpolationParams) => i18nT(key, params),
    [i18nT]
  );

  return { t, isLoading: !ready };
}

export function useAuthTranslation(): {
  t: (key: AuthKeys, params?: InterpolationParams) => string;
  isLoading: boolean;
} {
  const { t: i18nT, ready } = useI18nTranslation('auth');

  const t = useCallback(
    (key: AuthKeys, params?: InterpolationParams) => i18nT(key, params),
    [i18nT]
  );

  return { t, isLoading: !ready };
}

export function usePageTranslation(): {
  t: (key: PageKeys, params?: InterpolationParams) => string;
  isLoading: boolean;
} {
  const { t: i18nT, ready } = useI18nTranslation('pages');

  const t = useCallback(
    (key: PageKeys, params?: InterpolationParams) => i18nT(key, params),
    [i18nT]
  );

  return { t, isLoading: !ready };
}

/**
 * Utility hook for language switching
 */
export function useLanguageSwitcher() {
  const { i18n } = useI18nTranslation();

  const changeLanguage = async (language: string) => {
    await i18n.changeLanguage(language);
    // Persist language preference
    if (typeof window !== 'undefined') {
      localStorage.setItem('heistmind-language', language);
    }
  };

  return {
    currentLanguage: i18n.language,
    changeLanguage,
    // Only languages that actually ship translations — switching to anything else would render
    // an empty locale. Derived, so adding a translations entry is the whole rollout.
    supportedLanguages: AVAILABLE_LANGUAGES,
  };
}
