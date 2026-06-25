// Pure FitD dice resolution — no I/O, no randomness. The UI realizes the dice (Math.random) and
// passes the faces here; the repository recomputes the outcome from the faces so a roll's result
// can't be faked by the client. Re-exported via @heist-mind/shared for the web UI.

export type RollOutcome = 'crit' | 'success' | 'partial' | 'bad';
export type RollKind = 'action' | 'resistance' | 'fortune' | 'downtime';

/**
 * Classify dice faces the Forged-in-the-Dark way. Take the HIGHEST die: a 6 is a success (two or
 * more 6s is a critical), a 4–5 is a partial success, a 1–3 is a bad outcome. A **zero-dice** roll
 * (acting at rating 0) rolls two dice and takes the LOWEST, and can never crit.
 */
export function rollOutcome(results: number[], opts: { zeroDice?: boolean } = {}): RollOutcome {
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
