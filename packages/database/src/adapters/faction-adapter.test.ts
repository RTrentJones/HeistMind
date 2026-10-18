// The faction insert adapter — the GM's free-text "Add a faction" form (F96) writes name, tier,
// starting status and optional notes. Pins the clamp-to-FitD-bounds and the notes normalisation.
import { describe, expect, it } from 'vitest';
import { toSupabaseFactionInsert } from './faction-adapter';

describe('faction insert adapter', () => {
  it('writes the custom faction fields, notes trimmed', () => {
    const insert = toSupabaseFactionInsert(
      { gameId: 'g1', name: 'The Lampblacks', tier: 2, status: -1, notes: '  Rival gang  ' },
      'u1'
    );
    expect(insert).toMatchObject({
      game_id: 'g1',
      name: 'The Lampblacks',
      tier: 2,
      status: -1,
      notes: 'Rival gang',
      created_by: 'u1',
    });
  });

  it('stores blank or absent notes as null and defaults tier/status to 0', () => {
    expect(toSupabaseFactionInsert({ gameId: 'g1', name: 'A', notes: '   ' }, 'u1')).toMatchObject({
      notes: null,
      tier: 0,
      status: 0,
    });
    expect(toSupabaseFactionInsert({ gameId: 'g1', name: 'A' }, 'u1').notes).toBeNull();
  });

  it('clamps out-of-range tier and status to the FitD bounds (0–6, −3…+3)', () => {
    const insert = toSupabaseFactionInsert({ gameId: 'g1', name: 'A', tier: 9, status: -7 }, 'u1');
    expect(insert.tier).toBe(6);
    expect(insert.status).toBe(-3);
  });
});
