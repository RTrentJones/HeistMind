// Per-score loadout use-case: persist the settled loadout on the character, then log the change to
// the campaign feed (one entry per save; a standalone character has no feed — the save still lands).
import type { Character, CharacterLoadout, CharacterWithDetails, Result } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { notOwner } from './ownership';

export interface SaveLoadoutInput {
  character: CharacterWithDetails;
  userId: string;
  /** The loadout to persist, already tagged with the active score by the caller. */
  loadout: CharacterLoadout;
  /** Feed-entry copy — the client's localized string. */
  logNote: string;
}

export async function saveLoadout(
  repos: DatabaseRepositories,
  input: SaveLoadoutInput
): Promise<Result<Character>> {
  const { character, userId } = input;
  const owned = notOwner(character, userId);
  if (owned) return owned;
  // The VALIDATED write path: load legality (level caps, item load) is server-enforced like every
  // other character write — a non-web client can't persist an over-limit loadout.
  const updated = await repos.characterManagement.updateCharacterWithValidation(
    character.id,
    userId,
    { characterData: { ...character.characterData, loadout: input.loadout } }
  );
  if (!updated.success) return updated;
  if (character.gameId !== null) {
    const logged = await repos.rolls.create(userId, {
      gameId: character.gameId,
      characterId: character.id,
      kind: 'loadout',
      label: character.name,
      dice: 0,
      results: [],
      note: input.logNote,
    });
    if (!logged.success) return logged as Result<never>;
  }
  return updated;
}
