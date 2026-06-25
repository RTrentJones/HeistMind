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

/** A short, human label for a status value (war … allied). */
export function factionStatusLabel(status: number): string {
  const s = clampFactionStatus(status);
  if (s <= -3) return 'War';
  if (s < 0) return 'Hostile';
  if (s === 0) return 'Neutral';
  if (s < 3) return 'Friendly';
  return 'Allied';
}
