// Campaign size — how many players a campaign seats. RAW-agnostic: Forged in the Dark sets no table
// size, so this is product policy, not a rule. The DB (00026) stores SEATS in `games.max_players`
// and counts the GM's seat in `current_players` (the player-count trigger counts game_master +
// player + co_gm); the UI talks about PLAYERS — seats minus the GM's.
import type { Game } from '../domain';

/** The fewest players a GM may limit a campaign to. */
export const MIN_PLAYER_LIMIT = 1;
/** The most players a campaign may seat besides the GM (DB CHECK: max_players <= 31). */
export const MAX_PLAYER_LIMIT = 30;
/** A new campaign's player limit — never less than one join code's 20 uses (DB default 21). */
export const DEFAULT_PLAYER_LIMIT = 20;
/** Uses one join code grants (the web creates codes with this many). */
export const JOIN_CODE_USES = 20;

/** Seats for a player limit (the GM's seat included) — what `games.max_players` stores. */
export function seatsForPlayerLimit(players: number): number {
  return players + 1;
}

export interface CampaignCapacity {
  /** Players in the campaign now (the GM not counted). */
  players: number;
  /** The GM's player limit. */
  limit: number;
  /** Open player seats (never negative). */
  open: number;
  full: boolean;
}

/** A campaign's player count, limit and open seats, as the UI talks about them. */
export function campaignCapacity(
  game: Pick<Game, 'currentPlayers' | 'maxPlayers'>
): CampaignCapacity {
  const players = Math.max(0, game.currentPlayers - 1);
  const limit = Math.max(0, game.maxPlayers - 1);
  const open = Math.max(0, limit - players);
  return { players, limit, open, full: open === 0 };
}

/**
 * Why a GM's new player limit can't be saved, or null when it can: a whole number in
 * [MIN_PLAYER_LIMIT, MAX_PLAYER_LIMIT], and not below the players already in (they'd have no
 * seat — remove someone first).
 */
export function playerLimitRefusal(
  limit: number,
  playersIn: number
): 'NOT_A_NUMBER' | 'TOO_LOW' | 'TOO_HIGH' | 'BELOW_PLAYERS' | null {
  if (!Number.isInteger(limit)) return 'NOT_A_NUMBER';
  if (limit < MIN_PLAYER_LIMIT) return 'TOO_LOW';
  if (limit > MAX_PLAYER_LIMIT) return 'TOO_HIGH';
  if (limit < playersIn) return 'BELOW_PLAYERS';
  return null;
}
