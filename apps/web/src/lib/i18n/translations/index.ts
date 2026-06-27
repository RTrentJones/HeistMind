import en from '@/lib/i18n/translations/en.json';

// Export all translations with proper namespace structure
export const translations = {
  en: {
    common: en.common,
    navigation: en.navigation,
    components: en.components,
    auth: en.auth,
    pages: en.pages,
    forms: en.forms,
    errors: en.errors,
  },
};

/**
 * Languages that actually ship a message file. The language switcher is gated to this list, so it
 * stays hidden while only English exists and auto-enables when an `es`/`fr`/`de` file is added to
 * `translations` above — no UI change needed.
 */
export const AVAILABLE_LANGUAGES = Object.keys(translations) as Array<keyof typeof translations>;

// Generate TypeScript types from English translations
export type TranslationKeys = typeof en;
export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<TranslationKeys>;

// Common translation key types for better type checking
export type CommonKeys = NestedKeyOf<typeof en.common>;
export type NavigationKeys = NestedKeyOf<typeof en.navigation>;
export type ComponentKeys = NestedKeyOf<typeof en.components>;
export type AuthKeys = NestedKeyOf<typeof en.auth>;
export type PageKeys = NestedKeyOf<typeof en.pages>;
export type FormKeys = NestedKeyOf<typeof en.forms>;
export type ErrorKeys = NestedKeyOf<typeof en.errors>;

// Helper types for interpolation parameters
export type InterpolationParams = Record<string, string | number>;

// Type for translation function
export type TranslationFunction = (key: TranslationKey, params?: InterpolationParams) => string;
