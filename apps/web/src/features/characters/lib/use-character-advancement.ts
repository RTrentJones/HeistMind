'use client';

import { useState } from 'react';
import {
  grandfatherHeldAbilities,
  reconcileTraumaPending,
  validateCharacter,
  type CharacterAdvancement,
  type CharacterData,
  type CharacterWithDetails,
  type CrewContext,
} from '@heist-mind/core';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useAdvanceCharacter, useSaveCharacterBuild } from '@/features/characters/data/mutations';
import { errorCode, errorMessage } from '@/lib/query/result';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * What a build save came back with. `saved`/`conflict` carry the character data the editor should
 * rebase its draft onto: the merged row after a save, or the fresh live row after a conflict.
 */
export type SaveBuildOutcome =
  | { status: 'saved'; data: CharacterData }
  | { status: 'conflict' }
  | { status: 'failed' };

/**
 * The character write-side for the editor surfaces: validity-gated build saves (client-side
 * `validateCharacter` in `live` mode with the crew context raising the caps, then the same
 * validated repo path server-side) and XP-spend advancement (abilities / action dots). Owns the
 * shared saving/error state so view components stay presentational.
 */
export function useCharacterAdvancement(character: CharacterWithDetails, crew: CrewContext | null) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const saveBuildMut = useSaveCharacterBuild(character.id);
  const advanceChar = useAdvanceCharacter(character.id, character.gameId);
  const [error, setError] = useState<string | null>(null);
  const saving = saveBuildMut.isPending || advanceChar.isPending;
  const content = character.ruleset.content;

  /**
   * Save the draft as a PATCH of the fields changed vs `base` (the snapshot the draft started
   * from), merged server-side onto the live row — so harm/XP/stress written elsewhere since the
   * draft was taken are never reverted (review item 2).
   */
  const saveBuild = async (
    base: CharacterData,
    draft: CharacterData
  ): Promise<SaveBuildOutcome> => {
    const userId = user?.id;
    if (!userId) return { status: 'failed' };
    // Same grandfathering as the server: an unslotted cross-playbook ability the sheet already held
    // doesn't block an unrelated save (gear, harm) — only a newly added one does.
    // Validate the build as it will be stored: conditions picked since the snapshot pay down owed
    // trauma on save, so a fourth condition resolving the last debt isn't "trauma over the limit".
    const result = grandfatherHeldAbilities(
      validateCharacter(content, reconcileTraumaPending(base, draft), { mode: 'live', crew }),
      base.specialAbilities,
      draft.specialAbilities
    );
    if (!result.isValid) {
      setError(result.errors.map(e => e.message).join(' '));
      return { status: 'failed' };
    }
    try {
      const saved = await saveBuildMut.mutateAsync({ userId, base, draft });
      setError(null);
      return { status: 'saved', data: saved?.characterData ?? draft };
    } catch (err) {
      if (errorCode(err) === 'CHARACTER_CONFLICT') {
        setError(t('components.characterConflict.message'));
        return { status: 'conflict' };
      }
      setError(errorMessage(err) || t('components.characterEditor.saveFailed'));
      return { status: 'failed' };
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
