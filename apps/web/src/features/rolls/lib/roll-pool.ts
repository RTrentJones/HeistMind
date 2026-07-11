import { diceForRating } from '@heist-mind/core';

/**
 * The dice-pool derivation RollPanel rolls with — pure, so the panel's math is unit-testable
 * without realizing dice or mounting the form:
 * - action: rating + push (+1d) + devil's bargain (+1d) − harm penalty (BitD: moderate harm =
 *   −1d, F43); a 0-or-negative pool still rolls 2 take-lowest.
 * - fortune: the chosen die count, floored at 1 (a "0d fortune" makes no sense — the GM rolls 1).
 * - resistance: the attribute's rating through the same zero-dice rule.
 */
export function rollPool(input: {
  mode: 'action' | 'fortune' | 'resistance';
  rating: number;
  push?: boolean;
  bargain?: boolean;
  /** Teamwork assist (F10): a teammate takes 1 stress to add one die. */
  assist?: boolean;
  harmPenalty?: number;
  fortune?: number;
}): { count: number; zeroDice: boolean } {
  if (input.mode === 'fortune') {
    return { count: Math.max(input.fortune ?? 1, 1), zeroDice: false };
  }
  const extraDice =
    input.mode === 'action'
      ? (input.push ? 1 : 0) +
        (input.bargain ? 1 : 0) +
        (input.assist ? 1 : 0) -
        (input.harmPenalty ?? 0)
      : 0;
  return diceForRating(input.rating + extraDice);
}
