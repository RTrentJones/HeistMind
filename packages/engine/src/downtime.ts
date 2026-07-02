// Downtime use-cases. Indulge Vice (FitD A3): roll dice equal to your LOWEST attribute, clear
// stress equal to the highest die; clearing more than was marked is OVERINDULGENCE (a consequence
// the GM narrates). Dice are realized by the caller — `viceDicePool` gives it the pool.
import {
  deriveAttributes,
  diceForRating,
  isOverindulged,
  viceStressCleared,
  type CharacterWithDetails,
  type Result,
} from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';

/** The vice-roll dice pool for a character: dice = the LOWEST attribute rating (0 → 2 take-lowest). */
export function viceDicePool(character: CharacterWithDetails): {
  count: number;
  zeroDice: boolean;
} {
  const attrs = Object.values(deriveAttributes(character.ruleset.content, character.characterData));
  const lowest = attrs.length > 0 ? Math.min(...attrs) : 0;
  return diceForRating(lowest);
}

export interface IndulgeViceInput {
  character: CharacterWithDetails;
  userId: string;
  /** The realized vice-roll faces (pool from `viceDicePool`). */
  results: number[];
  zeroDice: boolean;
  /** The campaign-log entry label — client copy. */
  logLabel: string;
}

export interface IndulgeViceOutcome {
  cleared: number;
  overindulged: boolean;
  nextStress: number;
}

/**
 * Clear stress from a vice roll through the validated write path, then log the downtime to the
 * campaign feed (only when the character is in a campaign — a standalone character still clears
 * stress, it just has no shared log to write to).
 */
export async function indulgeVice(
  repos: DatabaseRepositories,
  input: IndulgeViceInput
): Promise<Result<IndulgeViceOutcome>> {
  const { character, userId, results, zeroDice } = input;
  const stress = character.characterData?.stress ?? 0;
  const cleared = viceStressCleared(results, { zeroDice });
  const overindulged = isOverindulged(cleared, stress);
  const nextStress = Math.max(0, stress - cleared);

  const updated = await repos.characterManagement.updateCharacterWithValidation(
    character.id,
    userId,
    { characterData: { ...character.characterData, stress: nextStress } }
  );
  if (!updated.success) return updated as Result<never>;

  if (character.gameId !== null) {
    const logged = await repos.rolls.create(userId, {
      gameId: character.gameId,
      characterId: character.id,
      kind: 'downtime',
      label: input.logLabel,
      dice: results.length,
      results,
    });
    if (!logged.success) return logged as Result<never>;
  }

  return { success: true, data: { cleared, overindulged, nextStress } };
}
