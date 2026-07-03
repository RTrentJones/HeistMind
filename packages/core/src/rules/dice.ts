// Pure FitD dice resolution — no I/O, no randomness. The UI realizes the dice (Math.random) and
// passes the faces here; the repository recomputes the outcome from the faces so a roll's result
// can't be faked by the client. Re-exported via @heist-mind/shared for the web UI.

export type RollOutcome = 'crit' | 'success' | 'partial' | 'bad';
// Everything after 'downtime' is a non-dice campaign-log event (no roll) carried in the same
// append-only log: 'loadout'/'score' lifecycle entries, 'crew'/'faction'/'clock' mechanical
// changes, 'xp' marks + advances, and 'note' — a manually recorded result (settled IRL or on
// Discord). Kinds are mirrored by the rolls table's kind CHECK (widened per migration).
export type RollKind =
  | 'action'
  | 'resistance'
  | 'fortune'
  | 'downtime'
  | 'loadout'
  | 'score'
  | 'crew'
  | 'faction'
  | 'clock'
  | 'xp'
  | 'note';

/**
 * Classify dice faces the Forged-in-the-Dark way. Take the HIGHEST die: a 6 is a success (two or
 * more 6s is a critical), a 4–5 is a partial success, a 1–3 is a bad outcome. A **zero-dice** roll
 * (acting at rating 0) rolls two dice and takes the LOWEST, and can never crit.
 */
export function rollOutcome(
  results: number[],
  opts: { zeroDice?: boolean | undefined } = {}
): RollOutcome {
  if (results.length === 0) return 'bad';
  if (opts.zeroDice) {
    const low = Math.min(...results);
    return low === 6 ? 'success' : low >= 4 ? 'partial' : 'bad';
  }
  if (results.filter(d => d === 6).length >= 2) return 'crit';
  const high = Math.max(...results);
  return high === 6 ? 'success' : high >= 4 ? 'partial' : 'bad';
}

/** How many dice a rating rolls: rating 0 rolls two dice and takes the lowest. */
export function diceForRating(rating: number): { count: number; zeroDice: boolean } {
  return rating <= 0 ? { count: 2, zeroDice: true } : { count: rating, zeroDice: false };
}

/**
 * Stress taken when resisting a consequence (BitD "Armor 2" resistance roll): stress equals
 * `6 − the HIGHEST die rolled`. Roll a 6 (or a crit) and you take 0 stress; the worst single die
 * takes 5. A roll with **no dice** (empty) takes the full 6. Never returns less than 0.
 */
export function resistanceStress(results: number[]): number {
  if (results.length === 0) return 6;
  return Math.max(0, 6 - Math.max(...results));
}

/**
 * Stress cleared when indulging your vice (BitD downtime): roll dice equal to your LOWEST attribute
 * rating and clear stress equal to the HIGHEST die. A zero-dice roll (lowest attribute 0) rolls two
 * dice and takes the LOWEST, like any 0-rated action; an empty roll clears nothing.
 * https://bladesinthedark.com/vice
 */
export function viceStressCleared(results: number[], opts: { zeroDice?: boolean } = {}): number {
  if (results.length === 0) return 0;
  return opts.zeroDice ? Math.min(...results) : Math.max(...results);
}

/**
 * You **overindulge** when your vice roll clears more stress than you currently have marked. The
 * consequence (Attract Trouble / Brag → +2 heat / Lost / Tapped) is narrated by the GM — this just
 * flags it. https://bladesinthedark.com/vice
 */
export function isOverindulged(cleared: number, stressMarked: number): boolean {
  return cleared > stressMarked;
}
