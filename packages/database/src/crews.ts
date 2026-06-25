// Pure crew-sheet bounds (no I/O), so the UI and the DB layer enforce identical FitD limits.
// The repository clamps every write through these; the DB CHECK constraints are the backstop.

import type { CrewHold } from './domain-types';

/** Upper bounds for the capped crew stats (FitD). Lower bound is always 0. */
export const CREW_LIMITS = { tier: 4, heat: 9, wanted: 4 } as const;

export type CrewStat = keyof typeof CREW_LIMITS;

/** Clamp a capped stat (tier/heat/wanted) into `[0, limit]`. */
export function clampCrewStat(stat: CrewStat, value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.floor(value), CREW_LIMITS[stat]));
}

/** Clamp an uncapped, non-negative crew value (rep / coin / vault). */
export function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/** Normalize a hold value (defaults to 'strong' when not a legal hold). */
export function normalizeHold(hold: string | null | undefined): CrewHold {
  return hold === 'weak' ? 'weak' : 'strong';
}
