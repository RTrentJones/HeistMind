// Character use-cases: the read-modify-write stress application, harm taken/cleared (with RAW
// track escalation), the retire sequence, and the XP economy (mark XP / spend an advance) —
// XP and harm changes are campaign-log events per BRD R-C3/R-E1.
import {
  clampStress,
  harmBounds,
  type Character,
  type CharacterAdvancement,
  type CharacterHarm,
  type HarmLevel,
  type Result,
  type Roll,
} from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { notOwner } from './ownership';

export interface ApplyStressInput {
  characterId: string;
  userId: string;
  /** Stress DELTA: positive is a cost, negative CLEARS stress (a crit resist clears 1). Zero is a no-op. */
  stress: number;
}

/**
 * Apply a stress delta to a character, clamped into the ruleset's track (a clear never goes below
 * 0). Reads the live character (current stress + bounds) then writes through the validated path.
 * Resolves `data: null` when nothing needed writing (no delta, character gone, or already at the
 * clamp).
 */
export async function applyStress(
  repos: DatabaseRepositories,
  input: ApplyStressInput
): Promise<Result<Character | null>> {
  if (input.stress === 0) return { success: true, data: null };
  const found = await repos.characters.findWithDetails(input.characterId);
  if (!found.success) return found;
  if (!found.data) return { success: true, data: null };
  const char = found.data;
  const owned = notOwner(char, input.userId);
  if (owned) return owned;
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
  const owned = notOwner(input.character, input.userId);
  if (owned) return owned;
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
  const owned = await assertOwnsById(repos, input.characterId, input.userId);
  if (owned) return owned;
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

const HARM_LEVELS: readonly HarmLevel[] = ['lesser', 'moderate', 'severe'];
const EMPTY_HARM: CharacterHarm = { lesser: [], moderate: [], severe: [] };

export interface TakeHarmInput {
  characterId: string;
  userId: string;
  /** The level the harm was DEALT at — a full track escalates it upward (RAW). */
  level: HarmLevel;
  /** The injury as it reads on the sheet (e.g. "Broken ribs"). */
  description: string;
  /** Log-event label — the client's localized string (the engine never owns copy). */
  logLabel: string;
  /**
   * Log-event note FACTORY — called with the level the harm actually LANDED at, which the client
   * can't know up front (RAW escalation happens here). Still client copy, just level-aware.
   */
  logNote: (appliedLevel: HarmLevel) => string;
}

/**
 * Take harm at a level, escalating past full tracks the RAW way (a full lesser track makes the
 * harm moderate, and so on). Every track full = failure `code: 'HARM_FULL'` — that's
 * trauma/death territory, a table conversation, not an automated write. Logs a `harm` feed event
 * when the character is in a campaign.
 */
export async function takeHarm(
  repos: DatabaseRepositories,
  input: TakeHarmInput
): Promise<Result<{ character: Character; appliedLevel: HarmLevel }>> {
  const found = await repos.characters.findWithDetails(input.characterId);
  if (!found.success) return found as Result<never>;
  if (!found.data) return { success: false, error: { message: 'Character not found' } };
  const char = found.data;
  const owned = notOwner(char, input.userId);
  if (owned) return owned;

  const bounds = harmBounds(char.ruleset.content);
  const harm = char.characterData.harm ?? EMPTY_HARM;
  const level = HARM_LEVELS.slice(HARM_LEVELS.indexOf(input.level)).find(
    l => harm[l].length < bounds[l]
  );
  if (!level) {
    return { success: false, error: { message: 'Every harm track is full', code: 'HARM_FULL' } };
  }

  const updated = await repos.characterManagement.updateCharacterWithValidation(
    char.id,
    input.userId,
    {
      characterData: {
        ...char.characterData,
        harm: { ...harm, [level]: [...harm[level], input.description] },
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
