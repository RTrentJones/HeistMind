import { describe, it, expect } from 'vitest';
import { CREW_LIMITS, clampCrewStat, clampNonNegative, normalizeHold } from './crews';

describe('crew bounds', () => {
  it('CREW_LIMITS are the BitD caps', () => {
    expect(CREW_LIMITS).toEqual({ tier: 4, heat: 9, wanted: 4 });
  });

  it('clampCrewStat keeps capped stats within [0, limit]', () => {
    expect(clampCrewStat('tier', 3)).toBe(3);
    expect(clampCrewStat('tier', 9)).toBe(4);
    expect(clampCrewStat('tier', -1)).toBe(0);
    expect(clampCrewStat('heat', 12)).toBe(9);
    expect(clampCrewStat('wanted', 4)).toBe(4);
    expect(clampCrewStat('wanted', 2.8)).toBe(2); // floored
    expect(clampCrewStat('heat', NaN)).toBe(0);
  });

  it('clampNonNegative floors at 0', () => {
    expect(clampNonNegative(5)).toBe(5);
    expect(clampNonNegative(-3)).toBe(0);
    expect(clampNonNegative(2.9)).toBe(2);
    expect(clampNonNegative(Infinity)).toBe(0);
  });

  it('normalizeHold defaults to strong unless weak', () => {
    expect(normalizeHold('weak')).toBe('weak');
    expect(normalizeHold('strong')).toBe('strong');
    expect(normalizeHold('nonsense')).toBe('strong');
    expect(normalizeHold(null)).toBe('strong');
    expect(normalizeHold(undefined)).toBe('strong');
  });
});
