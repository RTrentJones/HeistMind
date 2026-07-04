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
