// Roll use-cases: the sequenced parts of rolling — persist the roll, then apply its stress
// consequences. Dice are REALIZED by the caller (each client owns its randomness; the repository
// recomputes the outcome from the faces so results can't be forged) — the engine stays
// deterministic and unit-testable.
import { resistanceStress, type Result, type Roll } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { applyStress } from './characters';

export interface ActionRollInput {
  gameId: string;
  userId: string;
  characterId?: string;
  kind: 'action' | 'fortune';
  label: string;
  dice: number;
  results: number[];
  zeroDice: boolean;
  position?: string;
  effect?: string;
  /** Pre-roll moves note (client copy: pushed / devil's bargain). */
  note?: string;
  /** Pushing yourself costs 2 stress, applied win or lose (needs a characterId). */
  pushed?: boolean;
}

const PUSH_STRESS_COST = 2;

/** Persist an action/fortune roll, then charge the push cost when one was taken. */
export async function rollAction(
  repos: DatabaseRepositories,
  input: ActionRollInput
): Promise<Result<Roll>> {
  const created = await repos.rolls.create(input.userId, {
    gameId: input.gameId,
    ...(input.characterId !== undefined ? { characterId: input.characterId } : {}),
    kind: input.kind,
    label: input.label,
    dice: input.dice,
    results: input.results,
    zeroDice: input.zeroDice,
    ...(input.position !== undefined ? { position: input.position } : {}),
    ...(input.effect !== undefined ? { effect: input.effect } : {}),
    ...(input.note !== undefined ? { note: input.note } : {}),
  });
  if (!created.success) return created;
  if (input.pushed === true && input.characterId !== undefined) {
    const stressed = await applyStress(repos, {
      characterId: input.characterId,
      userId: input.userId,
      stress: PUSH_STRESS_COST,
    });
    if (!stressed.success) return stressed as Result<never>;
  }
  return created;
}

export interface ResistanceRollInput {
  gameId: string;
  userId: string;
  characterId?: string;
  label?: string;
  dice: number;
  results: number[];
  zeroDice: boolean;
}

/**
 * Persist a resistance roll and apply its stress delta (`6 − highest die`; a CRITICAL clears 1,
 * per RAW) to the resisting character. Returns the roll plus the delta actually applied
 * (−1 on a crit).
 */
export async function rollResistance(
  repos: DatabaseRepositories,
  input: ResistanceRollInput
): Promise<Result<{ roll: Roll; stress: number }>> {
  const stress = resistanceStress(input.results, { zeroDice: input.zeroDice });
  const created = await repos.rolls.create(input.userId, {
    gameId: input.gameId,
    ...(input.characterId !== undefined ? { characterId: input.characterId } : {}),
    kind: 'resistance',
    ...(input.label !== undefined ? { label: input.label } : {}),
    dice: input.dice,
    results: input.results,
    zeroDice: input.zeroDice,
  });
  if (!created.success) return created as Result<never>;
  if (input.characterId !== undefined && stress !== 0) {
    const stressed = await applyStress(repos, {
      characterId: input.characterId,
      userId: input.userId,
      stress,
    });
    if (!stressed.success) return stressed as Result<never>;
  }
  return { success: true, data: { roll: created.data, stress } };
}
