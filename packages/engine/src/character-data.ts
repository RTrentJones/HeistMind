// Targeted character-data writes (launch review item 2 — lost updates). Every sheet-face control
// used to spread the CLIENT's cached `characterData` and write the whole blob back, so a stale tab
// (or a dirty build-editor draft) silently reverted harm, XP, or stress another client — the GM on
// the web, the Discord bot — had written in between. These use-cases instead re-read the LIVE row
// and patch only the fields the caller owns, so concurrent writers to different fields never clobber
// each other. `saveCharacterBuild` adds a field-level optimistic-concurrency check: if a field the
// player edited ALSO changed underneath their draft, it refuses with `CHARACTER_CONFLICT` instead of
// overwriting the other writer.
import {
  applyStressChange,
  clampStress,
  type Character,
  type CharacterData,
  type CharacterWithDetails,
  type Result,
} from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { crewContextFor, notOwnerOrGm } from './ownership';

/** Order-insensitive structural equality for JSON-shaped data (JSONB reorders object keys). */
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => sameJson(v, b[i]));
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
  for (const k of keys) {
    if (!sameJson(ao[k], bo[k])) return false;
  }
  return true;
}

/**
 * The shared read-patch-write: load the live character, gate on owner-or-GM, let `build` derive a
 * PARTIAL patch from the fresh row (or short-circuit with a failure / `null` for no-op), then write
 * `{ ...fresh, ...patch }` through the validated path.
 */
async function patchLive(
  repos: DatabaseRepositories,
  characterId: string,
  userId: string,
  build: (
    fresh: CharacterWithDetails
  ) =>
    | Partial<CharacterData>
    | Result<never>
    | null
    | Promise<Partial<CharacterData> | Result<never> | null>
): Promise<Result<Character | null>> {
  const found = await repos.characters.findWithDetails(characterId);
  if (!found.success) return found as Result<never>;
  if (!found.data) return { success: false, error: { message: 'Character not found' } };
  const fresh = found.data;
  const denied = notOwnerOrGm(fresh, userId);
  if (denied) return denied;
  const patch = await build(fresh);
  if (patch === null) return { success: true, data: null };
  if ('success' in patch) return patch;
  return repos.characterManagement.updateCharacterWithValidation(characterId, userId, {
    characterData: { ...fresh.characterData, ...patch },
  });
}

export interface SetStressInput {
  characterId: string;
  userId: string;
  /** The ABSOLUTE stress value the player clicked; clamped into the ruleset's track. */
  stress: number;
}

/**
 * Set a character's stress to an absolute value (the sheet's live tracker), patching ONLY `stress`
 * onto the live row. Resolves `data: null` when the value is already current (no write).
 */
export function setStress(
  repos: DatabaseRepositories,
  input: SetStressInput
): Promise<Result<Character | null>> {
  return patchLive(repos, input.characterId, input.userId, async fresh => {
    const next = clampStress(
      fresh.ruleset.content,
      input.stress,
      fresh.characterData,
      await crewContextFor(repos, fresh.gameId)
    );
    return next === (fresh.characterData?.stress ?? 0) ? null : { stress: next };
  });
}

export interface SaveCharacterBuildInput {
  characterId: string;
  userId: string;
  /** The character data the editor's draft STARTED from (its last-synced snapshot). */
  base: CharacterData;
  /** The editor's draft. Only top-level fields that differ from `base` are written. */
  draft: CharacterData;
}

/**
 * Save the build editor's draft as a PATCH: only the top-level `characterData` fields the player
 * actually changed (vs the snapshot the draft started from) are written, merged onto the LIVE row.
 * Everything the editor didn't touch — harm the GM marked, XP the bot logged, the per-score
 * loadout, stress clicked on the sheet — keeps its live value.
 *
 * Optimistic concurrency, per field: if a field the player changed was ALSO changed by someone
 * else since `base` (live ≠ base, and live ≠ draft), the save is refused with
 * `code: 'CHARACTER_CONFLICT'` rather than silently overwriting the other writer. No changed
 * fields → `data: null`, no write.
 */
export function saveCharacterBuild(
  repos: DatabaseRepositories,
  input: SaveCharacterBuildInput
): Promise<Result<Character | null>> {
  return patchLive(repos, input.characterId, input.userId, async fresh => {
    const { base, draft } = input;
    const live = fresh.characterData as unknown as Record<string, unknown>;
    const from = base as unknown as Record<string, unknown>;
    const to = draft as unknown as Record<string, unknown>;
    const changed = [...new Set([...Object.keys(from), ...Object.keys(to)])].filter(
      k => !sameJson(from[k], to[k])
    );
    if (changed.length === 0) return null;
    const conflicts = changed.filter(k => !sameJson(live[k], from[k]) && !sameJson(live[k], to[k]));
    if (conflicts.length > 0) {
      return {
        success: false,
        error: {
          message: `Changed elsewhere while you were editing: ${conflicts.join(', ')}`,
          code: 'CHARACTER_CONFLICT',
          details: conflicts.join(','),
        },
      };
    }
    const patch = Object.fromEntries(changed.map(k => [k, to[k]])) as Partial<CharacterData>;
    // Raising stress in the editor follows the same RAW overflow as every other stress path:
    // marking the last box resets stress to 0 and owes a trauma (never a full track kept as-is).
    const liveStress = fresh.characterData.stress ?? 0;
    if (typeof patch.stress === 'number' && patch.stress > liveStress) {
      const change = applyStressChange(
        fresh.ruleset.content,
        { ...fresh.characterData, ...patch, stress: liveStress },
        patch.stress - liveStress,
        await crewContextFor(repos, fresh.gameId)
      );
      patch.stress = change.stress;
      if (change.traumaPending > 0) patch.traumaPending = change.traumaPending;
    }
    return patch;
  });
}
