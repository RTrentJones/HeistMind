import { describe, it, expect } from 'vitest';
import {
  FACTION_TIER_MAX,
  FACTION_STATUS_MIN,
  FACTION_STATUS_MAX,
  clampFactionTier,
  clampFactionStatus,
  factionStatusLabel,
} from './factions';

describe('faction bounds', () => {
  it('exposes the BitD ranges', () => {
    expect(FACTION_TIER_MAX).toBe(6);
    expect(FACTION_STATUS_MIN).toBe(-3);
    expect(FACTION_STATUS_MAX).toBe(3);
  });

  it('clampFactionTier keeps tier within [0, 6]', () => {
    expect(clampFactionTier(3)).toBe(3);
    expect(clampFactionTier(9)).toBe(6);
    expect(clampFactionTier(-1)).toBe(0);
    expect(clampFactionTier(2.9)).toBe(2);
    expect(clampFactionTier(NaN)).toBe(0);
  });

  it('clampFactionStatus keeps status within [-3, 3]', () => {
    expect(clampFactionStatus(0)).toBe(0);
    expect(clampFactionStatus(2)).toBe(2);
    expect(clampFactionStatus(5)).toBe(3);
    expect(clampFactionStatus(-5)).toBe(-3);
    expect(clampFactionStatus(-1.5)).toBe(-1); // truncated toward zero
    expect(clampFactionStatus(Infinity)).toBe(0);
  });

  it('factionStatusLabel uses the SRD name for each of the seven levels', () => {
    expect([-3, -2, -1, 0, 1, 2, 3].map(factionStatusLabel)).toEqual([
      'War',
      'Hostile',
      'Interfering',
      'Neutral',
      'Helpful',
      'Friendly',
      'Allies',
    ]);
    expect(factionStatusLabel(99)).toBe('Allies'); // clamped first
    expect(factionStatusLabel(-99)).toBe('War');
  });
});
