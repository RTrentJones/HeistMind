import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCharacterCreationStore } from '../stores/character-creation-store';

export interface CharacterSummary {
  charName: string;
  playbookName: string | null;
  /** e.g. "Insight 2" — only attributes with a rating > 0 */
  attrBadges: string[];
  /** selected special-ability names */
  abilityBadges: string[];
  /** heritage / background / vice values that are set */
  identityBadges: string[];
}

/**
 * Derived, display-ready view of the in-progress character draft. Shared by the
 * Review step and the Phase-2 live summary panel so they never drift.
 */
export function useCharacterSummary(): CharacterSummary {
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
      identityBadges: [draft.heritage, draft.background, draft.vice].filter(
        (v): v is string => !!v
      ),
    };
  }, [name, draft, ruleset]);
}
