// Pure faction bounds (no I/O), so the UI and the DB layer enforce identical FitD limits.
// Tier runs 0–6; status runs −3 (at war) … +3 (allied). The repository clamps every write
// through these; the DB CHECK constraints are the backstop.

/** Faction tier runs 0–6. */
export const FACTION_TIER_MAX = 6;
/** Faction status runs from −3 (at war) to +3 (allied). */
export const FACTION_STATUS_MIN = -3;
export const FACTION_STATUS_MAX = 3;

/** Clamp a tier into `[0, FACTION_TIER_MAX]`. */
export function clampFactionTier(tier: number): number {
  if (!Number.isFinite(tier)) return 0;
  return Math.max(0, Math.min(Math.floor(tier), FACTION_TIER_MAX));
}

/** Clamp a status into `[FACTION_STATUS_MIN, FACTION_STATUS_MAX]`. */
export function clampFactionStatus(status: number): number {
  if (!Number.isFinite(status)) return 0;
  return Math.max(FACTION_STATUS_MIN, Math.min(Math.trunc(status), FACTION_STATUS_MAX));
}

/**
 * The SRD's name for each status level ([SRD, Faction game → Faction status levels](
 * https://bladesinthedark.com/faction-game)), indexed by `status + 3`.
 */
export const FACTION_STATUS_LABELS = [
  'War',
  'Hostile',
  'Interfering',
  'Neutral',
  'Helpful',
  'Friendly',
  'Allies',
] as const;

/** A short, human label for a status value (War … Allies), per the SRD's seven levels. */
export function factionStatusLabel(status: number): string {
  // clampFactionStatus keeps the index in 0..6, so the lookup always hits.
  return FACTION_STATUS_LABELS[clampFactionStatus(status) - FACTION_STATUS_MIN] as string;
}
