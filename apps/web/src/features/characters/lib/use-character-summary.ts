import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCharacterCreationStore } from '../stores/character-creation-store';
import { useTranslation } from '@/lib/i18n/hooks';

export interface CharacterSummary {
  charName: string;
  playbookName: string | null;
  /** e.g. "Insight 2" — only attributes with a rating > 0 */
  attrBadges: string[];
  /** selected special-ability names */
  abilityBadges: string[];
  /**
   * Labelled heritage / background / vice values that are set — "Background: Underworld (Labor:
   * hunter)" — so the review never shows bare, unexplained chips (round-4 P2-16).
   */
  identityBadges: string[];
}

/**
 * Derived, display-ready view of the in-progress character draft. Shared by the
 * Review step and the Phase-2 live summary panel so they never drift.
 */
export function useCharacterSummary(): CharacterSummary {
  const { t } = useTranslation();
  const { name, draft, ruleset } = useCharacterCreationStore(
    useShallow(s => ({ name: s.name, draft: s.draft, ruleset: s.ruleset }))
  );

  return useMemo(() => {
    const playbook = ruleset?.content.playbooks.find(p => p.id === draft.playbook) ?? null;
    const attrDefs = ruleset?.content.attributes ?? [];
    const abilityDefs = ruleset?.content.specialAbilities ?? [];

    return {
      charName: name.trim() || 'Unnamed Scoundrel',
      playbookName: playbook?.name ?? null,
      attrBadges: attrDefs
        .filter(a => (draft.attributes[a.id] ?? 0) > 0)
        .map(a => `${a.name} ${draft.attributes[a.id]}`),
      abilityBadges: abilityDefs
        .filter(a => draft.specialAbilities.includes(a.id))
        .map(a => a.name),
      identityBadges: (
        [
          ['heritageLabel', draft.heritage, undefined],
          ['backgroundLabel', draft.background, draft.backgroundDetail],
          ['viceLabel', draft.vice, draft.viceDetail],
        ] as const
      )
        .filter(([, value]) => !!value?.trim())
        .map(([labelKey, value, detail]) => {
          const label = t(`components.steps.identity.${labelKey}`);
          return detail?.trim()
            ? t('components.steps.review.identityItemDetail', {
                label,
                value: value?.trim(),
                detail: detail.trim(),
              })
            : t('components.steps.review.identityItem', { label, value: value?.trim() });
        }),
    };
  }, [name, draft, ruleset, t]);
}
