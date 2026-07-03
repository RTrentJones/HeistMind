import { describe, it, expect } from 'vitest';
import {
  rollOutcome,
  diceForRating,
  resistanceStress,
  viceStressCleared,
  isOverindulged,
} from './dice';

describe('rollOutcome', () => {
  it('an empty roll is a bad outcome', () => {
    expect(rollOutcome([])).toBe('bad');
  });

  it('takes the highest die: 6=success, 4-5=partial, 1-3=bad', () => {
    expect(rollOutcome([1, 6, 3])).toBe('success');
    expect(rollOutcome([2, 4, 1])).toBe('partial');
    expect(rollOutcome([5, 2])).toBe('partial');
    expect(rollOutcome([1, 3, 2])).toBe('bad');
  });

  it('two or more 6s is a critical', () => {
    expect(rollOutcome([6, 6, 2])).toBe('crit');
    expect(rollOutcome([6, 6, 6])).toBe('crit');
    expect(rollOutcome([6, 5])).toBe('success'); // a single 6 is not a crit
  });

  it('zero-dice takes the LOWEST and never crits', () => {
    expect(rollOutcome([6, 6], { zeroDice: true })).toBe('success'); // both 6 → low is 6
    expect(rollOutcome([6, 4], { zeroDice: true })).toBe('partial'); // low is 4
    expect(rollOutcome([6, 1], { zeroDice: true })).toBe('bad'); // low is 1
  });
});

describe('diceForRating', () => {
  it('rating 0 rolls two dice, take lowest', () => {
    expect(diceForRating(0)).toEqual({ count: 2, zeroDice: true });
    expect(diceForRating(-1)).toEqual({ count: 2, zeroDice: true });
  });
  it('a positive rating rolls that many dice', () => {
    expect(diceForRating(3)).toEqual({ count: 3, zeroDice: false });
    expect(diceForRating(1)).toEqual({ count: 1, zeroDice: false });
  });
});

describe('resistanceStress', () => {
  it('takes 6 − highest die, using the HIGHEST result', () => {
    expect(resistanceStress([1])).toBe(5);
    expect(resistanceStress([4])).toBe(2);
    expect(resistanceStress([1, 6, 3])).toBe(0); // a 6 resists for free
    expect(resistanceStress([2, 5])).toBe(1);
  });

  it('a roll with no dice takes the full 6', () => {
    expect(resistanceStress([])).toBe(6);
  });

  it('a single 6 resists for free; a CRITICAL (two+ 6s) clears 1 stress (RAW)', () => {
    expect(resistanceStress([6])).toBe(0);
    expect(resistanceStress([6, 6])).toBe(-1);
    expect(resistanceStress([6, 6, 6])).toBe(-1); // still just 1 cleared
    expect(resistanceStress([6, 6, 1])).toBe(-1);
  });

  it('a ZERO-DICE resist takes the LOWEST die and can never crit (F64)', () => {
    expect(resistanceStress([1, 6], { zeroDice: true })).toBe(5);
    expect(resistanceStress([6, 6], { zeroDice: true })).toBe(0); // best case: free, not a crit
    expect(resistanceStress([3, 5], { zeroDice: true })).toBe(3);
  });
});

describe('viceStressCleared', () => {
  it('clears the HIGHEST die on a normal roll', () => {
    expect(viceStressCleared([1, 5, 3])).toBe(5);
    expect(viceStressCleared([2])).toBe(2);
  });
  it('takes the LOWEST die when rolling zero-dice (lowest attribute 0)', () => {
    expect(viceStressCleared([6, 2], { zeroDice: true })).toBe(2);
  });
  it('clears nothing on an empty roll', () => {
    expect(viceStressCleared([])).toBe(0);
  });
});

describe('isOverindulged', () => {
  it('is true only when more stress is cleared than was marked', () => {
    expect(isOverindulged(5, 3)).toBe(true);
    expect(isOverindulged(3, 3)).toBe(false);
    expect(isOverindulged(2, 5)).toBe(false);
  });
});
