import { describe, it, expect } from 'vitest';
import {
  CREW_LIMITS,
  REP_PER_TIER,
  CREW_XP_TRACK,
  clampCrewStat,
  clampNonNegative,
  normalizeHold,
  applyHeat,
  advanceTier,
  incarcerate,
  crewXp,
  crewAdvanceReady,
  withCrewXp,
} from './crews';

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

  it('applyHeat cascades to Wanted when the heat track fills (9)', () => {
    expect(applyHeat({ heat: 6, wanted: 0 }, 1)).toEqual({ heat: 7, wanted: 0 });
    // Fills at 9 → +1 wanted, heat resets carrying the remainder.
    expect(applyHeat({ heat: 7, wanted: 1 }, 4)).toEqual({ heat: 2, wanted: 2 });
    expect(applyHeat({ heat: 8, wanted: 0 }, 1)).toEqual({ heat: 0, wanted: 1 });
    // A big spike can raise Wanted twice.
    expect(applyHeat({ heat: 0, wanted: 0 }, 20)).toEqual({ heat: 2, wanted: 2 });
    // Once Wanted is maxed (4), extra heat just clamps at the cap.
    expect(applyHeat({ heat: 8, wanted: 4 }, 5)).toEqual({ heat: 9, wanted: 4 });
  });

  it('advanceTier spends a full Rep track to raise Tier (BitD)', () => {
    expect(REP_PER_TIER).toBe(12);
    // Short of a full track → no change.
    expect(advanceTier({ tier: 0, rep: 11 })).toEqual({ tier: 0, rep: 11 });
    // Full track → +1 Tier, Rep clears carrying the remainder.
    expect(advanceTier({ tier: 0, rep: 12 })).toEqual({ tier: 1, rep: 0 });
    expect(advanceTier({ tier: 1, rep: 14 })).toEqual({ tier: 2, rep: 2 });
    // One Tier per call (deliberate), even with a big Rep bank.
    expect(advanceTier({ tier: 0, rep: 30 })).toEqual({ tier: 1, rep: 18 });
    // No-op once Tier is maxed (4).
    expect(advanceTier({ tier: 4, rep: 20 })).toEqual({ tier: 4, rep: 20 });
  });

  it('incarcerate drops Wanted by 1 and clears Heat (BitD)', () => {
    expect(incarcerate({ heat: 7, wanted: 3 })).toEqual({ heat: 0, wanted: 2 });
    expect(incarcerate({ heat: 9, wanted: 1 })).toEqual({ heat: 0, wanted: 0 });
    // Wanted can't go below 0; heat still clears.
    expect(incarcerate({ heat: 5, wanted: 0 })).toEqual({ heat: 0, wanted: 0 });
  });

  it('crew advancement XP reads/clamps from the resources map and flags a full track', () => {
    expect(CREW_XP_TRACK).toBe(8);
    expect(crewXp({})).toBe(0);
    expect(crewXp({ 'crew-xp': 3 })).toBe(3);
    expect(crewXp({ 'crew-xp': 99 })).toBe(8); // clamped to the track
    expect(crewXp({ 'crew-xp': -2 })).toBe(0);
    expect(crewAdvanceReady({ 'crew-xp': 7 })).toBe(false);
    expect(crewAdvanceReady({ 'crew-xp': 8 })).toBe(true);
    // withCrewXp preserves other resource pools and clamps the XP.
    expect(withCrewXp({ hoard: 4 }, 5)).toEqual({ hoard: 4, 'crew-xp': 5 });
    expect(withCrewXp({}, 12)).toEqual({ 'crew-xp': 8 });
  });
});
