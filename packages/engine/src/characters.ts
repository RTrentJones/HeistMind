// Character use-cases: the read-modify-write stress application, harm taken/cleared (with RAW
// track escalation), the retire sequence, and the XP economy (mark XP / spend an advance) —
// XP and harm changes are campaign-log events per BRD R-C3/R-E1.
import {
  applyStressChange,
  availableArmor,
  chooseTraumaCondition,
  harmBounds,
  mustRetireFromTrauma,
  pendingTrauma,
  HARM_LEVELS,
  markXpTrack,
  PLAYBOOK_TRACK,
  usesXpTracks,
  type Character,
  type CharacterAdvancement,
  type CharacterHarm,
  type HarmLevel,
  type Result,
  type Roll,
} from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { crewContextFor, notOwner, notOwnerOrGm } from './ownership';

/**
 * Campaign-feed copy for a stress overflow (RAW: marking the last stress box = trauma). Functions of
 * the character's name so ONE copy object serves the roller and an assister alike — the engine
 * never owns copy.
 */
export interface TraumaLogCopy {
  /** "Mara marked her last stress box — trauma (stress cleared). Pick a condition on the sheet." */
  note: (characterName: string) => string;
  /** "Mara has reached the trauma limit and must retire." — logged when the trauma track fills. */
  retireNote: (characterName: string) => string;
}

export interface ApplyStressInput {
  characterId: string;
  userId: string;
  /** Stress DELTA: positive is a cost, negative CLEARS stress (a crit resist clears 1). Zero is a no-op. */
  stress: number;
  /** Feed copy for an overflow → trauma. Omitted = the trauma still lands, unlogged. */
  traumaLog?: TraumaLogCopy;
  /**
   * Feed copy for WHY the stress changed (e.g. "Bo marked 1 stress assisting Ana."), logged once
   * the write lands and BEFORE any trauma note, so the log reads cause → effect (round 6 P2-2).
   * Only logged when the character is in a campaign. Omitted = no cause line.
   */
  causeLog?: string;
}

export interface StressOutcome {
  character: Character;
  /** This change marked the last stress box: stress reset to 0 and one trauma is owed. */
  trauma: boolean;
  /** The character is at the trauma limit (retire, or take the fall). */
  mustRetire: boolean;
  /**
   * The stress (and any owed trauma) WAS written, but its campaign-feed note failed to insert.
   * The sheet is right; only the log line is missing — callers must not ask the player to mark
   * the stress again (that would double-charge). Absent when the feed write succeeded / wasn't
   * needed.
   */
  logError?: string;
}

/**
 * Apply a stress delta the RAW way (core `applyStressChange`): a clear never goes below 0, and a
 * cost that marks the LAST stress box resets stress to 0 and owes a trauma condition
 * (`characterData.traumaPending` — the player picks which on the sheet). Reads the live character
 * then writes through the validated path; an overflow is logged to the campaign feed when
 * `traumaLog` copy is supplied (plus a retirement note when the trauma track fills). Resolves
 * `data: null` when nothing needed writing (no delta, character gone, or already at the clamp).
 */
export async function applyStress(
  repos: DatabaseRepositories,
  input: ApplyStressInput
): Promise<Result<StressOutcome | null>> {
  if (input.stress === 0) return { success: true, data: null };
  const found = await repos.characters.findWithDetails(input.characterId);
  if (!found.success) return found as Result<never>;
  if (!found.data) return { success: true, data: null };
  const char = found.data;
  const owned = notOwnerOrGm(char, input.userId);
  if (owned) return owned;
  const data = char.characterData;
  // The campaign crew's abilities can grant stress boxes (`effects.stressBoxes`); the overflow
  // point must match the repository's validation, which counts them.
  const crew = await crewContextFor(repos, char.gameId);
  if (!crew.success) return crew as Result<never>;
  const change = applyStressChange(char.ruleset.content, data, input.stress, crew.data);
  if (!change.trauma && change.stress === (data?.stress ?? 0)) return { success: true, data: null };
  const updated = await repos.characterManagement.updateCharacterWithValidation(
    input.characterId,
    input.userId,
    {
      characterData: {
        ...data,
        stress: change.stress,
        ...(change.traumaPending > 0 ? { traumaPending: change.traumaPending } : {}),
      },
    }
  );
  if (!updated.success) return updated as Result<never>;
  // From here the stress + owed trauma are ON the sheet. A failed feed note is reported as
  // `logError` next to the applied outcome — never as the stress failing (callers would tell the
  // player to mark it again: a double charge).
  let logError: string | undefined;
  const notes: string[] = [];
  if (input.causeLog) notes.push(input.causeLog);
  if (change.trauma && input.traumaLog) {
    notes.push(input.traumaLog.note(char.name));
    if (change.mustRetire) notes.push(input.traumaLog.retireNote(char.name));
  }
  if (char.gameId !== null) {
    for (const note of notes) {
      const logged = await repos.rolls.create(input.userId, {
        gameId: char.gameId,
        characterId: char.id,
        kind: 'note',
        label: char.name,
        dice: 0,
        results: [],
        note,
      });
      if (!logged.success) {
        logError = logged.error.message || 'Feed note not written';
        break;
      }
    }
  }
  return {
    success: true,
    data: {
      character: updated.data,
      trauma: change.trauma,
      mustRetire: change.mustRetire,
      ...(logError !== undefined ? { logError } : {}),
    },
  };
}

export interface ChooseTraumaInput {
  characterId: string;
  userId: string;
  /** The condition to mark (one of the ruleset's `traumaConditions` when it names them). */
  condition: string;
  /** Feed copy — the client's localized strings. */
  logNote: string;
  /** Logged additionally when this pick fills the trauma track (retirement prompt). */
  retireNote: string;
}

/**
 * Resolve one owed trauma by marking the chosen condition (validated write), and log the pick to
 * the campaign feed. Refuses `NO_TRAUMA_PENDING` when nothing is owed and `INVALID_TRAUMA` for a
 * condition outside the ruleset's list or already marked.
 */
export async function chooseTrauma(
  repos: DatabaseRepositories,
  input: ChooseTraumaInput
): Promise<Result<{ character: Character; mustRetire: boolean }>> {
  const found = await repos.characters.findWithDetails(input.characterId);
  if (!found.success) return found as Result<never>;
  if (!found.data) return { success: false, error: { message: 'Character not found' } };
  const char = found.data;
  const owned = notOwnerOrGm(char, input.userId);
  if (owned) return owned;
  const content = char.ruleset.content;
  if (pendingTrauma(char.characterData) === 0) {
    return { success: false, error: { message: 'No trauma to choose', code: 'NO_TRAUMA_PENDING' } };
  }
  const next = chooseTraumaCondition(content, char.characterData, input.condition);
  if (!next) {
    return {
      success: false,
      error: { message: 'Not a valid trauma condition', code: 'INVALID_TRAUMA' },
    };
  }
  const updated = await repos.characterManagement.updateCharacterWithValidation(
    char.id,
    input.userId,
    { characterData: next }
  );
  if (!updated.success) return updated as Result<never>;
  const mustRetire = mustRetireFromTrauma(content, next);
  if (char.gameId !== null) {
    for (const note of mustRetire ? [input.logNote, input.retireNote] : [input.logNote]) {
      const logged = await repos.rolls.create(input.userId, {
        gameId: char.gameId,
        characterId: char.id,
        kind: 'note',
        label: char.name,
        dice: 0,
        results: [],
        note,
      });
      if (!logged.success) return logged as Result<never>;
    }
  }
  return { success: true, data: { character: updated.data, mustRetire } };
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
  const owned = notOwner(input.character, input.userId);
  if (owned) return owned;
  // Bank coin from the LIVE row (the passed character may be a stale roster snapshot).
  const found = await repos.characters.findById(input.character.id);
  if (!found.success) return found as Result<never>;
  const data = found.data?.characterData ?? input.character.characterData;
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

/** The by-id ownership precheck for use-cases whose repo write doesn't load the character first. */
async function assertOwnsById(
  repos: DatabaseRepositories,
  characterId: string,
  userId: string
): Promise<Result<never> | null> {
  const found = await repos.characters.findById(characterId);
  if (!found.success) return found as Result<never>;
  if (!found.data) return { success: false, error: { message: 'Character not found' } };
  return notOwner(found.data, userId);
}

export interface MarkXpInput {
  characterId: string;
  userId: string;
  /** XP to add to the pool/track (the repository records the reason with the write). */
  amount: number;
  reason: string;
  /**
   * Which XP track to mark on a TRACK-mode ruleset (`'playbook'` or an attribute id); default
   * playbook. Ignored on flat-pool rulesets.
   */
  track?: string;
  /** Log-event copy — the client's localized strings (the engine never owns copy). */
  logLabel: string;
  logNote: string;
}

/**
 * Mark XP on a character and log it to the campaign feed (BRD R-C3: XP changes are logged
 * events). MODE-AWARE (audit P1): a ruleset with `advancement.xpTracks` marks the chosen
 * TRACK on `characterData.xp` — the store `advanceCharacter` actually gates on — through the
 * validated write path; a flat-pool ruleset banks `experience_points` as before. A standalone
 * character has no feed — the mark still lands.
 */
export async function markXp(
  repos: DatabaseRepositories,
  input: MarkXpInput
): Promise<Result<Character>> {
  const found = await repos.characters.findWithDetails(input.characterId);
  if (!found.success) return found as Result<never>;
  if (!found.data) return { success: false, error: { message: 'Character not found' } };
  const char = found.data;
  const owned = notOwner(char, input.userId);
  if (owned) return owned;

  let updated: Result<Character>;
  if (usesXpTracks(char.ruleset.content)) {
    const track = input.track ?? PLAYBOOK_TRACK;
    const xp = markXpTrack(char.ruleset.content, char.characterData, track, input.amount);
    updated = await repos.characterManagement.updateCharacterWithValidation(char.id, input.userId, {
      characterData: { ...char.characterData, xp },
    });
  } else {
    updated = await repos.characters.addExperience(
      input.characterId,
      input.userId,
      input.amount,
      input.reason
    );
  }
  if (!updated.success) return updated;
  if (char.gameId !== null) {
    const logged = await repos.rolls.create(input.userId, {
      gameId: char.gameId,
      characterId: char.id,
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
  /**
   * The advancement to purchase — cost/prereq/track gating runs in the repository (server-side
   * for the bot only — F100).
   */
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
  const owned = await assertOwnsById(repos, input.characterId, input.userId);
  if (owned) return owned;
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

const EMPTY_HARM: CharacterHarm = { lesser: [], moderate: [], severe: [] };

export interface TakeHarmInput {
  characterId: string;
  userId: string;
  /** The level the harm was DEALT at — a full track escalates it upward (RAW). */
  level: HarmLevel;
  /** The injury as it reads on the sheet (e.g. "Broken ribs"). */
  description: string;
  /**
   * F44 — expend a carried, unspent armor item to reduce the harm ONE level before it lands
   * (lesser → absorbed entirely). No armor available = failure `code: 'NO_ARMOR'`.
   */
  spendArmor?: boolean;
  /** Log-event label — the client's localized string (the engine never owns copy). */
  logLabel: string;
  /**
   * Log-event note FACTORY — called with the level the harm actually LANDED at, which the client
   * can't know up front (RAW escalation happens here). `null` = armor absorbed it entirely.
   * Still client copy, just level-aware.
   */
  logNote: (appliedLevel: HarmLevel | null) => string;
}

/**
 * Take harm at a level, escalating past full tracks the RAW way (a full lesser track makes the
 * harm moderate, and so on). Every track full = failure `code: 'HARM_FULL'` — that's
 * trauma/death territory, a table conversation, not an automated write. With `spendArmor`, an
 * available armor item is expended FIRST (marked on `loadout.armorSpent`) and the harm drops one
 * level — lesser harm is absorbed outright (`appliedLevel: null`). Logs a `harm` feed event
 * when the character is in a campaign.
 */
export async function takeHarm(
  repos: DatabaseRepositories,
  input: TakeHarmInput
): Promise<Result<{ character: Character; appliedLevel: HarmLevel | null }>> {
  const found = await repos.characters.findWithDetails(input.characterId);
  if (!found.success) return found as Result<never>;
  if (!found.data) return { success: false, error: { message: 'Character not found' } };
  const char = found.data;
  const owned = notOwner(char, input.userId);
  if (owned) return owned;

  // Armor first (F44): expend one carried unspent armor item; the harm drops a level.
  let dealtAt: HarmLevel | null = input.level;
  let loadout = char.characterData.loadout;
  if (input.spendArmor) {
    const armor = availableArmor(char.ruleset.content, char.characterData)[0];
    if (!armor || !loadout) {
      return { success: false, error: { message: 'No armor to spend', code: 'NO_ARMOR' } };
    }
    loadout = { ...loadout, armorSpent: [...(loadout.armorSpent ?? []), armor.id] };
    const idx = HARM_LEVELS.indexOf(input.level);
    dealtAt = idx > 0 ? (HARM_LEVELS[idx - 1] ?? null) : null;
  }

  const bounds = harmBounds(char.ruleset.content);
  const harm = char.characterData.harm ?? EMPTY_HARM;
  const level =
    dealtAt === null
      ? null
      : (HARM_LEVELS.slice(HARM_LEVELS.indexOf(dealtAt)).find(l => harm[l].length < bounds[l]) ??
        undefined);
  if (level === undefined) {
    return { success: false, error: { message: 'Every harm track is full', code: 'HARM_FULL' } };
  }

  const updated = await repos.characterManagement.updateCharacterWithValidation(
    char.id,
    input.userId,
    {
      characterData: {
        ...char.characterData,
        ...(loadout ? { loadout } : {}),
        harm: level === null ? harm : { ...harm, [level]: [...harm[level], input.description] },
      },
    }
  );
  if (!updated.success) return updated as Result<never>;
  if (char.gameId !== null) {
    const logged = await repos.rolls.create(input.userId, {
      gameId: char.gameId,
      characterId: char.id,
      kind: 'harm',
      label: input.logLabel,
      dice: 0,
      results: [],
      note: input.logNote(level),
    });
    if (!logged.success) return logged as Result<never>;
  }
  return { success: true, data: { character: updated.data, appliedLevel: level } };
}

export interface ClearHarmInput {
  characterId: string;
  userId: string;
  level: HarmLevel;
  /** The exact entry to clear, as it reads on the sheet (clients offer the current entries). */
  description: string;
  /** Log-event copy — the client's localized strings (the engine never owns copy). */
  logLabel: string;
  logNote: string;
}

/**
 * Clear ONE matching harm entry at a level (recovery/downtime). No such entry = failure
 * `code: 'HARM_NOT_FOUND'` so clients can phrase it. Logs a `harm` feed event when the character
 * is in a campaign.
 */
export async function clearHarm(
  repos: DatabaseRepositories,
  input: ClearHarmInput
): Promise<Result<Character>> {
  const found = await repos.characters.findWithDetails(input.characterId);
  if (!found.success) return found as Result<never>;
  if (!found.data) return { success: false, error: { message: 'Character not found' } };
  const char = found.data;
  const owned = notOwner(char, input.userId);
  if (owned) return owned;

  const harm = char.characterData.harm ?? EMPTY_HARM;
  const entries = harm[input.level];
  const at = entries.indexOf(input.description);
  if (at === -1) {
    return { success: false, error: { message: 'No such harm entry', code: 'HARM_NOT_FOUND' } };
  }

  const updated = await repos.characterManagement.updateCharacterWithValidation(
    char.id,
    input.userId,
    {
      characterData: {
        ...char.characterData,
        harm: { ...harm, [input.level]: entries.filter((_, i) => i !== at) },
      },
    }
  );
  if (!updated.success) return updated;
  if (char.gameId !== null) {
    const logged = await repos.rolls.create(input.userId, {
      gameId: char.gameId,
      characterId: char.id,
      kind: 'harm',
      label: input.logLabel,
      dice: 0,
      results: [],
      note: input.logNote,
    });
    if (!logged.success) return logged as Result<never>;
  }
  return updated;
}
