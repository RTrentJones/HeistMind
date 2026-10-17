// Roll use-cases: the sequenced parts of rolling — persist the roll, then apply its stress
// consequences. Dice are REALIZED by the caller (each client owns its randomness; the repository
// recomputes the outcome from the faces so results can't be forged) — the engine stays
// deterministic and unit-testable.
import { resistanceStress, type Result, type Roll } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { applyStress, type TraumaLogCopy } from './characters';

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
  /** Pre-roll moves note (client copy: pushed / devil's bargain / assisted-by). */
  note?: string;
  /** Pushing yourself costs 2 stress, applied win or lose (needs a characterId). */
  pushed?: boolean;
  /**
   * Teamwork — ASSIST (BitD: a teammate takes 1 stress to add +1d; F10). The CLIENT adds the die
   * to the pool it realizes; the engine charges the assister's stress with the roll when the
   * ROLLER may write that character (their own alt, or the GM). Ownership is a hard security
   * boundary — when the assister belongs to another player, the charge is refused with
   * NOT_OWNER and the roll still lands: the feed note names the assist, and the assister marks
   * their own 1 stress from their sheet (the async self-service the table already uses).
   */
  assist?: { characterId: string };
  /** Feed copy when a push/assist cost marks someone's last stress box (→ trauma). */
  traumaLog?: TraumaLogCopy;
}

const PUSH_STRESS_COST = 2;
const ASSIST_STRESS_COST = 1;

/** Persist an action/fortune roll, then charge the push + assist stress costs taken with it. */
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
      ...(input.traumaLog ? { traumaLog: input.traumaLog } : {}),
    });
    if (!stressed.success) return stressed as Result<never>;
  }
  if (input.assist !== undefined) {
    const assisted = await applyStress(repos, {
      characterId: input.assist.characterId,
      userId: input.userId,
      stress: ASSIST_STRESS_COST,
      ...(input.traumaLog ? { traumaLog: input.traumaLog } : {}),
    });
    // NOT_OWNER = the assister is another player's character — the roll stands; they self-mark
    // (see the assist doc above). Anything else is a real failure.
    if (!assisted.success && assisted.error.code !== 'NOT_OWNER') {
      return assisted as Result<never>;
    }
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
  /** Feed copy when the resistance cost marks the last stress box (→ trauma). */
  traumaLog?: TraumaLogCopy;
}

/**
 * Persist a resistance roll and apply its stress delta (`6 − highest die`; a CRITICAL clears 1,
 * per RAW) to the resisting character. Returns the roll, the delta (−1 on a crit), and whether the
 * cost marked the last stress box (`trauma` — stress reset to 0, a condition owed; `mustRetire`
 * when that fills the trauma track).
 */
export async function rollResistance(
  repos: DatabaseRepositories,
  input: ResistanceRollInput
): Promise<Result<{ roll: Roll; stress: number; trauma: boolean; mustRetire: boolean }>> {
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
  let trauma = false;
  let mustRetire = false;
  if (input.characterId !== undefined && stress !== 0) {
    const stressed = await applyStress(repos, {
      characterId: input.characterId,
      userId: input.userId,
      stress,
      ...(input.traumaLog ? { traumaLog: input.traumaLog } : {}),
    });
    if (!stressed.success) return stressed as Result<never>;
    trauma = stressed.data?.trauma ?? false;
    mustRetire = stressed.data?.mustRetire ?? false;
  }
  return { success: true, data: { roll: created.data, stress, trauma, mustRetire } };
}
