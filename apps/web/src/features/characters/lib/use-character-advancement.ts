'use client';

import { useState } from 'react';
import {
  validateCharacter,
  type CharacterAdvancement,
  type CharacterData,
  type CharacterWithDetails,
  type CrewContext,
} from '@heist-mind/core';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useAdvanceCharacter, useUpdateCharacterData } from '@/features/characters/data/mutations';
import { errorMessage } from '@/lib/query/result';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * The character write-side for the editor surfaces: validity-gated build saves (client-side
 * `validateCharacter` in `live` mode with the crew context raising the caps, then the same
 * validated repo path server-side) and XP-spend advancement (abilities / action dots). Owns the
 * shared saving/error state so view components stay presentational.
 */
export function useCharacterAdvancement(character: CharacterWithDetails, crew: CrewContext | null) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const updateData = useUpdateCharacterData(character.id);
  const advanceChar = useAdvanceCharacter(character.id, character.gameId);
  const [error, setError] = useState<string | null>(null);
  const saving = updateData.isPending || advanceChar.isPending;
  const content = character.ruleset.content;

  const saveBuild = async (draft: CharacterData) => {
    const userId = user?.id;
    if (!userId) return;
    const result = validateCharacter(content, draft, { mode: 'live', crew });
    if (!result.isValid) {
      setError(result.errors.map(e => e.message).join(' '));
      return;
    }
    try {
      await updateData.mutateAsync({ userId, data: { characterData: draft } });
      setError(null);
    } catch (err) {
      setError(errorMessage(err) || t('components.characterEditor.saveFailed'));
    }
  };

  const advance = async (advancement: CharacterAdvancement, logNote: string) => {
    const userId = user?.id;
    if (!userId) return;
    try {
      await advanceChar.mutateAsync({
        userId,
        advancement,
        logLabel: character.name,
        logNote,
      });
      setError(null);
    } catch (err) {
      setError(errorMessage(err) || t('components.characterEditor.advancementFailed'));
    }
  };

  const buyAbility = (abilityId: string, cost: number, name: string) =>
    void advance(
      { type: 'ability', target: abilityId, cost, description: `Learn ${name}` },
      t('components.characterEditor.logAdvanceAbility', { name })
    );

  // Spend a full attribute XP track on an action dot (server gates on the track being full).
  const advanceAction = (action: string) =>
    void advance(
      { type: 'skill', target: action, value: 1, cost: 0, description: `Add a dot to ${action}` },
      t('components.characterEditor.logAdvanceAction', { action })
    );

  return { saving, error, saveBuild, buyAbility, advanceAction };
}
