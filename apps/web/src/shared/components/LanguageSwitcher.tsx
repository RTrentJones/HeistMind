'use client';

import { Select } from '@heist-mind/ui';
import { useComponentTranslation, useLanguageSwitcher } from '@/lib/i18n/hooks';
import { AVAILABLE_LANGUAGES } from '@/lib/i18n/translations';

// Endonyms (a language is shown in its own name), so these are intentionally not translated.
const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
};

/**
 * Locale picker, gated to languages that actually ship a message file (`AVAILABLE_LANGUAGES`).
 * While only English exists it renders nothing; adding an `es`/`fr`/`de` translation file makes it
 * appear automatically. Reuses `useLanguageSwitcher()` (persists the choice to localStorage).
 */
export function LanguageSwitcher() {
  const { t } = useComponentTranslation();
  const { currentLanguage, changeLanguage } = useLanguageSwitcher();

  const languages = AVAILABLE_LANGUAGES.filter(lang => LANGUAGE_LABELS[lang]);
  if (languages.length <= 1) return null;

  return (
    <Select
      value={currentLanguage}
      onChange={e => changeLanguage(e.target.value)}
      aria-label={t('languageSwitcher.label')}
      selectSize='sm'
      className='text-foreground-secondary'
    >
      {languages.map(lang => (
        <option key={lang} value={lang}>
          {LANGUAGE_LABELS[lang]}
        </option>
      ))}
    </Select>
  );
}
