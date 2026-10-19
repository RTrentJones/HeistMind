// Roll use-cases: the sequenced parts of rolling — persist the roll, then apply its stress
// consequences. Dice are REALIZED by the caller (each client owns its randomness; the repository
// recomputes the outcome from the faces so results can't be forged) — the engine stays
// deterministic and unit-testable.
import {
  desperateRollXp,
  desperateRollXpBlockedTrack,
  markXpTrack,
  xpTrackSize,
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
   * Teamwork — ASSIST (BitD RAW: the helper takes 1 stress to give +1d; F10). The CLIENT adds the
   * die to the pool it realizes; the engine charges the helper's stress with the roll. When the
   * ROLLER may write that character (their own alt, or the GM) it goes through the normal
   * validated write (overflow → trauma included). Ownership is a hard security boundary, so when
   * the helper belongs to ANOTHER player the engine uses the one narrow cross-player write
   * (`rolls.chargeAssistStress`, 00027/00028): +1 stress, once per roll, held back (`near_limit`)
   * when it would mark the helper's last box — trauma is the owner's moment. That write is bound
   * to the helper RECORDED on the roll (round 6 P1-1), so the engine stores `characterId` on the
   * roll itself (`assistCharacterId` — action rolls with a character only), and the server writes
   * that charge's log line from the characters' names. Either way the roll lands, and `assist` on
   * the outcome says what happened so the client can tell the table (F103).
   *
   * Feed copy (client-localized) for the paths the CLIENT writes: `logNote` — the helper marked it
   * through the validated write (own alt / GM); `owedLogNote` — the write FAILED, so the log says
   * the helper still owes it (round 6 P2-2).
   */
  assist?: { characterId: string; logNote?: string; owedLogNote?: string };
  /** Feed copy when a push/assist cost marks someone's last stress box (→ trauma). */
  traumaLog?: TraumaLogCopy;
  /**
   * The ACTION rolled (a name from the ruleset's `attributes[].skills`). With `position:
   * 'desperate'` on an action roll, the engine marks the ruleset's desperate-roll XP in that
   * action's attribute track (BitD RAW) — pass it whenever the roll is an action roll.
   */
  action?: string;
  /**
   * Feed copy for the desperate-roll XP the engine marks (round 5 P2-8: the sheet said "marked
   * 1 XP in Prowess" but the log didn't, so the GM never saw it). Given the track id (null on a
   * flat-pool ruleset) and the amount; logged as an `xp` event on the rolling character. Omit to
   * log nothing.
   */
  desperateXpLog?: (track: string | null, amount: number) => string;
}

/** The desperate-roll XP the engine marked with a roll. */
export interface DesperateXpMark {
  /** The attribute track marked (null on a flat-pool ruleset — the marks went to the pool). */
  track: string | null;
  amount: number;
  /** Marks in that track after the roll (the pool total on a flat-pool ruleset). */
  marks: number;
  /**
   * The track was ALREADY full, so nothing was marked (`amount` 0, `marks` = the track size) —
   * RAW the XP is earned but has nowhere to go until the player takes an advance. Clients say so
   * ("Prowess track full — take an advance") instead of staying silent (round 4 P2-N4).
   */
  trackFull?: boolean;
}

const PUSH_STRESS_COST = 2;
const ASSIST_STRESS_COST = 1;

/** What the engine did about an assist's 1 stress (F103). */
export interface AssistStressOutcome {
  characterId: string;
  /**
   * `charged` — the helper's +1 stress is on their sheet (`trauma` when it marked the last box —
   * own/GM writes only); `near_limit` — another player's helper is one box from trauma, so
   * nothing was written and they mark it themselves; `failed` — the write failed (`error`).
   */
  status: 'charged' | 'near_limit' | 'failed';
  trauma?: boolean;
  error?: string;
  /** The stress WAS marked, but its feed note failed (nothing to re-mark). */
  logError?: string;
}

/** A persisted action roll plus what its push cost actually did to the roller's stress. */
export type ActionRollOutcome = Roll & {
  /** The applied push-stress change (null when not pushed / nothing written) — never a prediction. */
  pushStress: StressOutcome | null;
  /**
   * The roll LANDED, but writing its push stress failed (e.g. the sheet fails a live validation).
   * Like `desperateXpError`, reported next to the saved roll — never as the roll failing, whose
   * natural retry would duplicate it (round 5 P2-5). Null when nothing went wrong.
   */
  stressError: string | null;
  /** The assist's stress, when the roll had an assist (null otherwise). */
  assist: AssistStressOutcome | null;
  /** The desperate-roll XP marked with this roll (null when none applied). */
  desperateXp: DesperateXpMark | null;
  /**
   * The roll (and its stress) LANDED, but marking its desperate XP failed (e.g. the sheet fails a
   * live validation). Reported separately so a client never calls an already-saved roll "failed"
   * — it tells the player to mark the XP on the sheet instead. Null when nothing went wrong.
   */
  desperateXpError: string | null;
};

/**
 * RAW ([SRD, Advancement](https://bladesinthedark.com/advancement)): "Every time you make a
 * desperate action roll, mark 1 xp in the attribute for the action you rolled." Marks it through
 * the validated write path. Skips (null) when the ruleset has no desperate-roll trigger or the
 * roller may not write the character; a FULL track comes back as `trackFull` (nothing marked) so
 * the client can tell the player — the roll itself stands either way.
 */
async function markDesperateXp(
  repos: DatabaseRepositories,
  input: Pick<
    ActionRollInput,
    'kind' | 'position' | 'characterId' | 'action' | 'userId' | 'desperateXpLog'
  >
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
  if (!earned) {
    const full = desperateRollXpBlockedTrack(content, char.characterData, input.action);
    return full === null
      ? { success: true, data: null }
      : {
          success: true,
          data: { track: full, amount: 0, marks: xpTrackSize(content, full), trackFull: true },
        };
  }
  if (earned.track === null) {
    const added = await repos.characters.addExperience(
      char.id,
      input.userId,
      earned.amount,
      'Desperate action roll'
    );
    if (!added.success) return added as Result<never>;
    await logDesperateXp(repos, char, input, null, earned.amount);
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
  await logDesperateXp(repos, char, input, earned.track, earned.amount);
  return {
    success: true,
    data: { track: earned.track, amount: earned.amount, marks: xp.attributes[earned.track] ?? 0 },
  };
}

/**
 * Log the desperate-roll XP to the campaign feed (when the client supplied copy and the character
 * is in a campaign). Best effort: the XP is already marked, so a log failure is not reported as
 * the XP failing.
 */
async function logDesperateXp(
  repos: DatabaseRepositories,
  char: { id: string; name: string; gameId: string | null },
  input: Pick<ActionRollInput, 'userId' | 'desperateXpLog'>,
  track: string | null,
  amount: number
): Promise<void> {
  if (!input.desperateXpLog || char.gameId === null) return;
  await repos.rolls.create(input.userId, {
    gameId: char.gameId,
    characterId: char.id,
    kind: 'xp',
    label: char.name,
    dice: 0,
    results: [],
    note: input.desperateXpLog(track, amount),
  });
}

export interface DesperateRollXpInput {
  characterId: string;
  userId: string;
  /** The action rolled (a name from the ruleset's `attributes[].skills`). */
  action: string;
}

/**
 * The same desperate-roll XP as `rollAction`, for a roll with no campaign log to persist into —
 * a standalone sheet's display-only action roll (F96) still earns its RAW attribute XP.
 */
export function markDesperateRollXp(
  repos: DatabaseRepositories,
  input: DesperateRollXpInput
): Promise<Result<DesperateXpMark | null>> {
  return markDesperateXp(repos, { ...input, kind: 'action', position: 'desperate' });
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
    // Round 6 P1-1 — the helper is recorded WITH the roll; the cross-player charge is bound to it.
    ...(input.assist !== undefined && input.kind === 'action' && input.characterId !== undefined
      ? { assistCharacterId: input.assist.characterId }
      : {}),
  });
  if (!created.success) return created as Result<never>;
  // Everything below is a SIDE EFFECT of a roll that is already in the log: a failed write is
  // reported next to the saved roll, never as the roll failing (round 4 P2-N4, round 5 P2-5).
  let pushStress: StressOutcome | null = null;
  let stressError: string | null = null;
  if (input.pushed === true && input.characterId !== undefined) {
    const stressed = await applyStress(repos, {
      characterId: input.characterId,
      userId: input.userId,
      stress: PUSH_STRESS_COST,
      ...(input.traumaLog ? { traumaLog: input.traumaLog } : {}),
    });
    if (stressed.success) pushStress = stressed.data;
    else stressError = stressed.error.message || 'Stress not marked';
  }
  const assist =
    input.assist === undefined ? null : await chargeAssist(repos, input, created.data.id);
  // Desperate-roll XP lands AFTER the stress costs, so it is marked on the freshest row.
  const desperate = await markDesperateXp(repos, input);
  return {
    success: true,
    data: {
      ...created.data,
      pushStress,
      stressError,
      assist,
      desperateXp: desperate.success ? desperate.data : null,
      desperateXpError: desperate.success ? null : desperate.error.message || 'XP not marked',
    },
  };
}

/** The assist's 1 stress: the validated write when the roller may write the helper, else 00027. */
async function chargeAssist(
  repos: DatabaseRepositories,
  input: ActionRollInput,
  rollId: string
): Promise<AssistStressOutcome> {
  const characterId = input.assist?.characterId ?? '';
  const assisted = await applyStress(repos, {
    characterId,
    userId: input.userId,
    stress: ASSIST_STRESS_COST,
    ...(input.traumaLog ? { traumaLog: input.traumaLog } : {}),
    // The same feed line as the cross-player charge, so the log always names who paid the assist —
    // written before any trauma note it causes (cause → effect, round 6 P2-2).
    ...(input.assist?.logNote ? { causeLog: input.assist.logNote } : {}),
  });
  if (assisted.success) {
    return {
      characterId,
      status: 'charged',
      trauma: assisted.data?.trauma ?? false,
      ...(assisted.data?.logError ? { logError: assisted.data.logError } : {}),
    };
  }
  if (assisted.error.code !== 'NOT_OWNER') {
    // The roller may write this helper — the write itself failed: log that they still owe it.
    await logAssistOwed(repos, input, characterId);
    return { characterId, status: 'failed', error: assisted.error.message || 'Stress not marked' };
  }
  // Another player's helper → the narrow cross-player charge (RLS would refuse a plain write). It
  // writes its own log line (charged / owed) server-side from trusted names (00028).
  const charged = await repos.rolls.chargeAssistStress(rollId, characterId);
  if (!charged.success) {
    // RLS won't let the roller log against the helper's character: the owed line goes on the
    // ROLLING character (the roller's own row), still naming the helper.
    await logAssistOwed(repos, input, input.characterId);
    return { characterId, status: 'failed', error: charged.error.message || 'Stress not marked' };
  }
  return { characterId, status: charged.data };
}

/**
 * Best effort: the assist's stress was NOT marked, so the campaign log says the helper still owes
 * it (round 6 P2-2 — the roll's own "Assisted by …" note no longer claims the stress was paid).
 */
async function logAssistOwed(
  repos: DatabaseRepositories,
  input: ActionRollInput,
  onCharacterId: string | undefined
): Promise<void> {
  const note = input.assist?.owedLogNote;
  if (!note || onCharacterId === undefined) return;
  await repos.rolls.create(input.userId, {
    gameId: input.gameId,
    characterId: onCharacterId,
    kind: 'note',
    dice: 0,
    results: [],
    note,
  });
}

export interface ResistanceRollInput {
  gameId: string;
  userId: string;
  characterId?: string;
  label?: string;
  dice: number;
  results: number[];
  zeroDice: boolean;
  /** Free-text note persisted with the roll (e.g. "Includes +1d from an ability or upgrade."). */
  note?: string;
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
): Promise<
  Result<{
    roll: Roll;
    stress: number;
    trauma: boolean;
    mustRetire: boolean;
    /** The roll landed but its stress write failed (round 5 P2-5); null when it was applied. */
    stressError: string | null;
    /**
     * The stress WAS applied (trauma flags above are real) but its trauma feed note failed —
     * the log line is missing, nothing needs re-marking. Null otherwise.
     */
    logError: string | null;
  }>
> {
  const stress = resistanceStress(input.results, { zeroDice: input.zeroDice });
  const created = await repos.rolls.create(input.userId, {
    gameId: input.gameId,
    ...(input.characterId !== undefined ? { characterId: input.characterId } : {}),
    kind: 'resistance',
    ...(input.label !== undefined ? { label: input.label } : {}),
    dice: input.dice,
    results: input.results,
    zeroDice: input.zeroDice,
    ...(input.note !== undefined ? { note: input.note } : {}),
  });
  if (!created.success) return created as Result<never>;
  let trauma = false;
  let mustRetire = false;
  let stressError: string | null = null;
  let logError: string | null = null;
  if (input.characterId !== undefined && stress !== 0) {
    const stressed = await applyStress(repos, {
      characterId: input.characterId,
      userId: input.userId,
      stress,
      ...(input.traumaLog ? { traumaLog: input.traumaLog } : {}),
    });
    // The roll is already in the log: a failed stress write is reported next to it, not as the
    // roll failing (a retry would log a duplicate resistance roll).
    if (stressed.success) {
      trauma = stressed.data?.trauma ?? false;
      mustRetire = stressed.data?.mustRetire ?? false;
      logError = stressed.data?.logError ?? null;
    } else {
      stressError = stressed.error.message || 'Stress not marked';
    }
  }
  return {
    success: true,
    data: { roll: created.data, stress, trauma, mustRetire, stressError, logError },
  };
}
