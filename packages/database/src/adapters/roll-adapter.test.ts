// Round-trip spec for the roll adapter — pins the zero_dice persistence added by 00020
// (audit P2): the flag must survive write → row → domain, because `dice` stores the dice
// actually ROLLED (2 on a zero pool) and can't signal the take-lowest rule to display-time
// recomputes.
import { describe, expect, it } from 'vitest';
import type { CreateRollData } from '@heist-mind/core';
import { fromSupabaseRoll, toSupabaseRollInsert } from './roll-adapter';

const CREATE: CreateRollData = {
  gameId: 'g1',
  characterId: 'c1',
  kind: 'resistance',
  label: 'Prowess',
  dice: 2,
  results: [2, 5],
  zeroDice: true,
};

describe('roll adapter', () => {
  it('persists zeroDice on insert and reads it back on the domain Roll', () => {
    const insert = toSupabaseRollInsert(CREATE, 'u1', 'bad', null);
    expect(insert.zero_dice).toBe(true);
    expect(insert.dice).toBe(2); // dice keeps meaning "dice actually rolled"

    const row = {
      id: 'r1',
      game_id: 'g1',
      character_id: 'c1',
      user_id: 'u1',
      kind: 'resistance',
      label: 'Prowess',
      dice: 2,
      zero_dice: true,
      results: [2, 5],
      outcome: 'bad',
      position: null,
      effect: null,
      note: null,
      score_id: null,
      created_at: '2026-07-04T00:00:00Z',
    };
    const roll = fromSupabaseRoll(row as Parameters<typeof fromSupabaseRoll>[0]);
    expect(roll.zeroDice).toBe(true);
    expect(roll.dice).toBe(2);
  });

  it('defaults zero_dice to false when the creator omits the flag', () => {
    const insert = toSupabaseRollInsert({ ...CREATE, zeroDice: undefined }, 'u1', 'bad', null);
    expect(insert.zero_dice).toBe(false);
  });
});
