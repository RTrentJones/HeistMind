import { diceForRating } from '@heist-mind/core';

/**
 * The dice-pool derivation RollPanel rolls with — pure, so the panel's math is unit-testable
 * without realizing dice or mounting the form:
 * - action: rating + push (+1d) + devil's bargain (+1d); a 0-pool still rolls 2 take-lowest.
 * - fortune: the chosen die count, floored at 1 (a "0d fortune" makes no sense — the GM rolls 1).
 * - resistance: the attribute's rating through the same zero-dice rule.
 */
export function rollPool(input: {
  mode: 'action' | 'fortune' | 'resistance';
  rating: number;
  push?: boolean;
  bargain?: boolean;
  fortune?: number;
}): { count: number; zeroDice: boolean } {
  if (input.mode === 'fortune') {
    return { count: Math.max(input.fortune ?? 1, 1), zeroDice: false };
  }
  const extraDice =
    input.mode === 'action' ? (input.push ? 1 : 0) + (input.bargain ? 1 : 0) : 0;
  return diceForRating(input.rating + extraDice);
}
