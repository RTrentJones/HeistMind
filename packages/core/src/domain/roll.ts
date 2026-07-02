// A persisted dice roll — the per-game, play-by-post campaign log entry.
import type { RollKind, RollOutcome } from '../rules/dice';

/** A persisted dice roll — the per-game, play-by-post roll log. */
export interface Roll {
  id: string;
  gameId: string;
  characterId: string | null;
  userId: string;
  kind: RollKind;
  label: string | null;
  dice: number;
  results: number[];
  outcome: RollOutcome;
  position: string | null;
  effect: string | null;
  note: string | null;
  /** The score / operation this event belongs to (the feed groups by it); null if outside a score. */
  scoreId: string | null;
  createdAt: Date;
}

export interface CreateRollData {
  gameId: string;
  characterId?: string;
  kind: RollKind;
  label?: string;
  dice: number;
  results: number[];
  /** When true the roll took the LOWEST of the dice (rating 0); drives the outcome recompute. */
  zeroDice?: boolean;
  position?: string;
  effect?: string;
  note?: string;
  /**
   * The score to tag this event with. Omit (undefined) to let the repository auto-tag the campaign's
   * active score; pass an explicit id (e.g. a score's own start/end event) or null to skip tagging.
   */
  scoreId?: string | null;
}
