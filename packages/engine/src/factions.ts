// Faction use-cases: a status change is table-visible mechanical state (war … allied), so it
// persists AND logs a 'faction' event to the campaign feed.
import { clampFactionStatus, type Faction, type Result } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';

export interface SetFactionStatusInput {
  /** The client's loaded faction (the write targets its id). */
  faction: Faction;
  userId: string;
  /** The new absolute status; clamped into the FitD −3…+3 band by the rules. */
  status: number;
  /** Log-event copy — the client's localized strings (the engine never owns copy). */
  logLabel: string;
  logNote: string;
}

/** Set a faction's status toward the crew and log the shift to the feed. */
export async function setFactionStatus(
  repos: DatabaseRepositories,
  input: SetFactionStatusInput
): Promise<Result<Faction>> {
  const status = clampFactionStatus(input.status);
  const updated = await repos.factions.update(input.faction.id, { status });
  if (!updated.success) return updated;
  const logged = await repos.rolls.create(input.userId, {
    gameId: input.faction.gameId,
    kind: 'faction',
    label: input.logLabel,
    dice: 0,
    results: [],
    note: input.logNote,
  });
  if (!logged.success) return logged as Result<never>;
  return updated;
}
