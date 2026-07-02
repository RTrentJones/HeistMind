// Character use-cases: the read-modify-write stress application and the retire sequence.
import { clampStress, type Character, type Result, type Roll } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';

export interface ApplyStressInput {
  characterId: string;
  userId: string;
  /** Stress to ADD (a cost). Zero/negative is a no-op success. */
  stress: number;
}

/**
 * Apply a stress cost to a character, clamped into the ruleset's track. Reads the live character
 * (current stress + bounds) then writes through the validated path. Resolves `data: null` when
 * nothing needed writing (no cost, character gone, or already at the clamp).
 */
export async function applyStress(
  repos: DatabaseRepositories,
  input: ApplyStressInput
): Promise<Result<Character | null>> {
  if (input.stress <= 0) return { success: true, data: null };
  const found = await repos.characters.findWithDetails(input.characterId);
  if (!found.success) return found;
  if (!found.data) return { success: true, data: null };
  const char = found.data;
  const current = char.characterData?.stress ?? 0;
  const next = clampStress(char.ruleset.content, current + input.stress);
  if (next === current) return { success: true, data: null };
  return repos.characterManagement.updateCharacterWithValidation(input.characterId, input.userId, {
    characterData: { ...char.characterData, stress: next },
  });
}

export interface RetireCharacterInput {
  character: Character;
  userId: string;
  gameId: string;
  /** The campaign-log note copy — the CLIENT's localized string (engine never owns copy). */
  logNote: string;
}

/**
 * Retire a character: status → retired, carried coin banked into stash (BitD), then a campaign-log
 * note so the shared feed records it.
 */
export async function retireCharacter(
  repos: DatabaseRepositories,
  input: RetireCharacterInput
): Promise<Result<Roll>> {
  const data = input.character.characterData;
  const coins = data?.coins ?? 0;
  const updated = await repos.characters.update(input.character.id, input.userId, {
    status: 'retired',
    characterData: { ...data, stash: (data?.stash ?? 0) + coins, coins: 0 },
  });
  if (!updated.success) return updated as Result<never>;
  return repos.rolls.create(input.userId, {
    gameId: input.gameId,
    characterId: input.character.id,
    kind: 'note',
    label: input.character.name,
    dice: 0,
    results: [],
    note: input.logNote,
  });
}
