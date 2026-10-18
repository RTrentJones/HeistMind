// Roll use-cases: the sequenced parts of rolling — persist the roll, then apply its stress
// consequences. Dice are REALIZED by the caller (each client owns its randomness; the repository
// recomputes the outcome from the faces so results can't be forged) — the engine stays
// deterministic and unit-testable.
import {
  desperateRollXp,
  markXpTrack,
  resistanceStress,
  type Result,
  type Roll,
} from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { applyStress, type StressOutcome, type TraumaLogCopy } from './characters';
import { notOwnerOrGm } from './ownership';

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
  /**
   * The ACTION rolled (a name from the ruleset's `attributes[].skills`). With `position:
   * 'desperate'` on an action roll, the engine marks the ruleset's desperate-roll XP in that
   * action's attribute track (BitD RAW) — pass it whenever the roll is an action roll.
   */
  action?: string;
}

/** The desperate-roll XP the engine marked with a roll. */
export interface DesperateXpMark {
  /** The attribute track marked (null on a flat-pool ruleset — the marks went to the pool). */
  track: string | null;
  amount: number;
  /** Marks in that track after the roll (the pool total on a flat-pool ruleset). */
  marks: number;
}

const PUSH_STRESS_COST = 2;
const ASSIST_STRESS_COST = 1;

/** A persisted action roll plus what its push cost actually did to the roller's stress. */
export type ActionRollOutcome = Roll & {
  /** The applied push-stress change (null when not pushed / nothing written) — never a prediction. */
  pushStress: StressOutcome | null;
  /** The desperate-roll XP marked with this roll (null when none applied). */
  desperateXp: DesperateXpMark | null;
};

/**
 * RAW ([SRD, Advancement](https://bladesinthedark.com/advancement)): "Every time you make a
 * desperate action roll, mark 1 xp in the attribute for the action you rolled." Marks it through
 * the validated write path. Silently skips (null) when the ruleset has no desperate-roll trigger,
 * the track is already full, or the roller may not write the character — the roll itself stands.
 */
async function markDesperateXp(
  repos: DatabaseRepositories,
  input: ActionRollInput
): Promise<Result<DesperateXpMark | null>> {
  if (input.kind !== 'action' || input.position !== 'desperate')
    return { success: true, data: null };
  if (input.characterId === undefined || !input.action) return { success: true, data: null };
  const found = await repos.characters.findWithDetails(input.characterId);
  if (!found.success) return found as Result<never>;
  const char = found.data;
  if (!char || notOwnerOrGm(char, input.userId)) return { success: true, data: null };
  const content = char.ruleset.content;
  const earned = desperateRollXp(content, char.characterData, input.action);
  if (!earned) return { success: true, data: null };
  if (earned.track === null) {
    const added = await repos.characters.addExperience(
      char.id,
      input.userId,
      earned.amount,
      'Desperate action roll'
    );
    if (!added.success) return added as Result<never>;
    return {
      success: true,
      data: { track: null, amount: earned.amount, marks: added.data.experiencePoints },
    };
  }
  const xp = markXpTrack(content, char.characterData, earned.track, earned.amount);
  const updated = await repos.characterManagement.updateCharacterWithValidation(
    char.id,
    input.userId,
    { characterData: { ...char.characterData, xp } }
  );
  if (!updated.success) return updated as Result<never>;
  return {
    success: true,
    data: { track: earned.track, amount: earned.amount, marks: xp.attributes[earned.track] ?? 0 },
  };
}

/** Persist an action/fortune roll, then charge the push + assist stress costs taken with it. */
export async function rollAction(
  repos: DatabaseRepositories,
  input: ActionRollInput
): Promise<Result<ActionRollOutcome>> {
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
  if (!created.success) return created as Result<never>;
  let pushStress: StressOutcome | null = null;
  if (input.pushed === true && input.characterId !== undefined) {
    const stressed = await applyStress(repos, {
      characterId: input.characterId,
      userId: input.userId,
      stress: PUSH_STRESS_COST,
      ...(input.traumaLog ? { traumaLog: input.traumaLog } : {}),
    });
    if (!stressed.success) return stressed as Result<never>;
    pushStress = stressed.data;
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
  // Desperate-roll XP lands AFTER the stress costs, so it is marked on the freshest row.
  const desperate = await markDesperateXp(repos, input);
  if (!desperate.success) return desperate as Result<never>;
  return { success: true, data: { ...created.data, pushStress, desperateXp: desperate.data } };
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
