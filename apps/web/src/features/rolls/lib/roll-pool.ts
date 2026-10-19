import { diceForRating } from '@heist-mind/core';

/**
 * The dice-pool derivation RollPanel rolls with — pure, so the panel's math is unit-testable
 * without realizing dice or mounting the form:
 * - action: rating + (push OR devil's bargain: +1d, never both) + assist (+1d) − harm penalty
 *   (BitD: moderate harm = −1d, F43); a 0-or-negative pool still rolls 2 take-lowest.
 * - fortune: the chosen die count, floored at 1 (a "0d fortune" makes no sense — the GM rolls 1).
 * - resistance: the attribute's rating through the same zero-dice rule.
 * - `bonus` (action + resistance): the ±Nd an ability or upgrade sets on this roll (Ambush +1d,
 *   Iron Will +1d, Daredevil −1d) — the bot's `/roll bonus:` / `/resist bonus:`, −3…+3. A pool
 *   pushed below 0 by a penalty still rolls as 0d (2 take-lowest), never fewer.
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
  /** Ability / upgrade dice, signed (round 4 — parity with the bot's `bonus:`). */
  bonus?: number;
}): { count: number; zeroDice: boolean } {
  if (input.mode === 'fortune') {
    return { count: Math.max(input.fortune ?? 1, 1), zeroDice: false };
  }
  // RAW: push OR a devil's bargain grants the bonus die — never both — plus one for an assist.
  const extraDice =
    input.mode === 'action'
      ? (input.push || input.bargain ? 1 : 0) + (input.assist ? 1 : 0) - (input.harmPenalty ?? 0)
      : 0;
  return diceForRating(Math.max(0, input.rating + extraDice + (input.bonus ?? 0)));
}
