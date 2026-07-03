// Character use-cases: the read-modify-write stress application, the retire sequence, and the
// XP economy (mark XP / spend an advance) — XP changes are campaign-log events per BRD R-C3.
import {
  clampStress,
  type Character,
  type CharacterAdvancement,
  type Result,
  type Roll,
} from '@heist-mind/core';
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

export interface MarkXpInput {
  characterId: string;
  userId: string;
  /** XP to add to the pool/track (the repository records the reason with the write). */
  amount: number;
  reason: string;
  /** Log-event copy — the client's localized strings (the engine never owns copy). */
  logLabel: string;
  logNote: string;
}

/**
 * Mark XP on a character and log it to the campaign feed (BRD R-C3: XP changes are logged
 * events). A standalone character has no feed — the mark still lands.
 */
export async function markXp(
  repos: DatabaseRepositories,
  input: MarkXpInput
): Promise<Result<Character>> {
  const updated = await repos.characters.addExperience(
    input.characterId,
    input.userId,
    input.amount,
    input.reason
  );
  if (!updated.success) return updated;
  if (updated.data.gameId !== null) {
    const logged = await repos.rolls.create(input.userId, {
      gameId: updated.data.gameId,
      characterId: updated.data.id,
      kind: 'xp',
      label: input.logLabel,
      dice: 0,
      results: [],
      note: input.logNote,
    });
    if (!logged.success) return logged as Result<never>;
  }
  return updated;
}

export interface AdvanceCharacterInput {
  characterId: string;
  userId: string;
  /** The advancement to purchase — cost/prereq/track gating runs server-side in the repository. */
  advancement: CharacterAdvancement;
  /** Log-event copy — the client's localized strings (the engine never owns copy). */
  logLabel: string;
  logNote: string;
}

/**
 * Spend XP on an advancement through the validated repository path, then log the advance to the
 * campaign feed (BRD R-C3). A standalone character has no feed — the advance still lands.
 */
export async function advanceCharacter(
  repos: DatabaseRepositories,
  input: AdvanceCharacterInput
): Promise<Result<Character>> {
  const advanced = await repos.characterManagement.advanceCharacter(
    input.characterId,
    input.userId,
    input.advancement
  );
  if (!advanced.success) return advanced;
  if (advanced.data.gameId !== null) {
    const logged = await repos.rolls.create(input.userId, {
      gameId: advanced.data.gameId,
      characterId: advanced.data.id,
      kind: 'xp',
      label: input.logLabel,
      dice: 0,
      results: [],
      note: input.logNote,
    });
    if (!logged.success) return logged as Result<never>;
  }
  return advanced;
}
