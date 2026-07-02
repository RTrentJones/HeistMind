// Pure crew-sheet bounds (no I/O), so the UI and the DB layer enforce identical FitD limits.
// The repository clamps every write through these; the DB CHECK constraints are the backstop.

import type { CrewHold } from '../domain';

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

/**
 * Apply a heat change with the BitD Wanted cascade: when the heat track fills (9), the crew gains a
 * Wanted level and heat resets, carrying any remainder. Wanted clamps at its cap (4); once maxed,
 * extra heat just clamps at the cap. Returns the new `{ heat, wanted }`.
 * https://bladesinthedark.com (crew heat → wanted)
 */
export function applyHeat(
  current: { heat: number; wanted: number },
  delta: number
): { heat: number; wanted: number } {
  let heat = Math.max(0, Math.floor(current.heat + delta));
  let wanted = clampCrewStat('wanted', current.wanted);
  while (heat >= CREW_LIMITS.heat && wanted < CREW_LIMITS.wanted) {
    heat -= CREW_LIMITS.heat;
    wanted += 1;
  }
  return { heat: Math.min(heat, CREW_LIMITS.heat), wanted };
}

/** Rep needed to advance the crew one Tier — the length of the Rep track (BitD: fill Rep → +1 Tier). */
export const REP_PER_TIER = 12;

/**
 * Advance the crew one Tier by spending a full Rep track: BitD raises Tier when the Rep track fills,
 * then clears it (carrying any remainder). A no-op once Tier is maxed (4) or Rep is short of a track.
 * Returns the new `{ tier, rep }`. https://bladesinthedark.com/index.php/advancement
 */
export function advanceTier(current: { tier: number; rep: number }): {
  tier: number;
  rep: number;
} {
  const tier = clampCrewStat('tier', current.tier);
  const rep = clampNonNegative(current.rep);
  if (tier >= CREW_LIMITS.tier || rep < REP_PER_TIER) return { tier, rep };
  return { tier: tier + 1, rep: rep - REP_PER_TIER };
}

/**
 * Apply an incarceration — BitD's direct way to cool off: when a crew member, ally, contact, or a
 * framed enemy is convicted and jailed, the crew's Wanted level drops by 1 and its Heat clears.
 * Returns the new `{ heat, wanted }`. https://bladesinthedark.com/index.php/heat
 */
export function incarcerate(current: { heat: number; wanted: number }): {
  heat: number;
  wanted: number;
} {
  return { heat: 0, wanted: Math.max(0, clampCrewStat('wanted', current.wanted) - 1) };
}

// ----- crew advancement (XP) -------------------------------------------------------------------
// BitD: a crew earns XP from its triggers (a smart operation, contending with a greater foe,
// bolstering its rep, expressing its nature); fill the advancement track → take a crew special
// ability and reset. The XP rides a reserved key in the existing `resources` map so the feature
// needs no schema migration (it can graduate to a dedicated column later). 8 mirrors the playbook
// XP track. https://bladesinthedark.com/index.php/advancement

/** Crew advancement track length — fill it to take a crew advance, then reset. */
export const CREW_XP_TRACK = 8;
/** Reserved `resources` key the crew's advancement XP is stored under. */
export const CREW_XP_KEY = 'crew-xp';

/** The crew's current advancement XP, clamped to `[0, CREW_XP_TRACK]`. */
export function crewXp(resources: Record<string, number>): number {
  return Math.max(0, Math.min(CREW_XP_TRACK, Math.floor(resources[CREW_XP_KEY] ?? 0)));
}

/** Whether the advancement track is full (a crew advance is available). */
export function crewAdvanceReady(resources: Record<string, number>): boolean {
  return crewXp(resources) >= CREW_XP_TRACK;
}

/** A new `resources` map with the crew's advancement XP set to `value` (clamped to the track). */
export function withCrewXp(
  resources: Record<string, number>,
  value: number
): Record<string, number> {
  return { ...resources, [CREW_XP_KEY]: crewXp({ [CREW_XP_KEY]: value }) };
}
