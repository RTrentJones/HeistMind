// The engine-level ownership gate. Service-role callers (the Discord bot) BYPASS Postgres RLS,
// and the repository write paths key on the row id alone — so every character-mutating use-case
// asserts creator-is-actor HERE, closing the hole for every present and future service-role
// caller (the RLS'd web client gets the same check for free).
import type { Character, Result } from '@heist-mind/core';

/** Null when the actor owns the character; the ready-to-return failure otherwise. */
export function notOwner(
  character: Pick<Character, 'createdBy'>,
  userId: string
): Result<never> | null {
  if (character.createdBy === userId) return null;
  return { success: false, error: { message: 'Not the character owner', code: 'NOT_OWNER' } };
}

/**
 * Null when the actor owns the character OR is its campaign's GM — mirrors the characters RLS
 * write policy (owner OR the game's creator), so the sheet-face edits a GM may make on the web
 * (stress, XP marks, the build editor) behave identically through the engine.
 */
export function notOwnerOrGm(
  character: Pick<Character, 'createdBy'> & { game?: { createdBy: string } | null },
  userId: string
): Result<never> | null {
  if (character.createdBy === userId) return null;
  if (character.game?.createdBy === userId) return null;
  return notOwner(character, userId);
}
