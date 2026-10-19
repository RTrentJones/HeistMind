// Round 4 P1-N1 — the campaign player limit (seats = players + the GM's).
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PLAYER_LIMIT,
  JOIN_CODE_USES,
  MAX_PLAYER_LIMIT,
  campaignCapacity,
  playerLimitRefusal,
  seatsForPlayerLimit,
} from './campaign';

describe('campaign player limit', () => {
  it('a new campaign seats at least one join code worth of players', () => {
    expect(DEFAULT_PLAYER_LIMIT).toBeGreaterThanOrEqual(JOIN_CODE_USES);
    // The DB default (00026) is the GM + the default limit; the CHECK allows the GM + the max.
    expect(seatsForPlayerLimit(DEFAULT_PLAYER_LIMIT)).toBe(21);
    expect(seatsForPlayerLimit(MAX_PLAYER_LIMIT)).toBe(31);
  });

  it('capacity counts players without the GM', () => {
    expect(campaignCapacity({ currentPlayers: 6, maxPlayers: 21 })).toEqual({
      players: 5,
      limit: 20,
      open: 15,
      full: false,
    });
    expect(campaignCapacity({ currentPlayers: 6, maxPlayers: 6 }).full).toBe(true);
    // Degenerate rows never go negative.
    expect(campaignCapacity({ currentPlayers: 0, maxPlayers: 0 })).toEqual({
      players: 0,
      limit: 0,
      open: 0,
      full: true,
    });
  });

  it.each([
    [0, 0, 'TOO_LOW'],
    [31, 0, 'TOO_HIGH'],
    [2.5, 0, 'NOT_A_NUMBER'],
    [Number.NaN, 0, 'NOT_A_NUMBER'],
    [4, 5, 'BELOW_PLAYERS'],
    [5, 5, null],
    [30, 0, null],
    [1, 0, null],
  ] as const)('limit %s with %s players in → %s', (limit, playersIn, refusal) => {
    expect(playerLimitRefusal(limit, playersIn)).toBe(refusal);
  });
});
