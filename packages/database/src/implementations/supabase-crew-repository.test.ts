// Round-3 #1 — the crew repository's server-side ability gate (core `checkCrewProgression`) against
// a stubbed client: a write that ADDS a crew ability must be one legal advance from the stored row.
// Ruleset content is the real BitD builtin shape via its crew slice (fixture provenance lives in
// core/shared; this suite only proves the repository wires the check in and refuses before writing).
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrewRules } from '@heist-mind/core';
import type { Database } from '../supabase-types';
import { SupabaseCrewRepository } from './supabase-crew-repository';

const CREW_RULES: CrewRules = {
  types: [
    { id: 'shadows', name: 'Shadows', description: '' },
    { id: 'assassins', name: 'Assassins', description: '' },
  ],
  abilities: [
    { id: 'crew-second-story', name: 'Second Story', description: '', crewType: 'shadows' },
    { id: 'crew-network', name: 'Pack Rats', description: '', crewType: 'shadows' },
    { id: 'crew-deadly', name: 'Deadly', description: '', crewType: 'assassins' },
    { id: 'crew-mastery', name: 'Mastery', description: '', upgradeBoxes: 4 },
  ],
};

function crewRow(abilities: string[], resources: Record<string, number>) {
  return {
    id: 'cr1',
    game_id: 'g1',
    name: 'Crew',
    crew_type: 'shadows',
    tier: 0,
    rep: 0,
    heat: 0,
    wanted: 0,
    hold: 'strong',
    coin: 0,
    vault: 0,
    crew_abilities: abilities,
    claims: [],
    cohorts: [],
    resources,
    created_by: 'gm',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

/** A table-dispatching stub: reads return the given rows; an update echoes the stored crew. */
function client(stored: ReturnType<typeof crewRow>, failTable?: string) {
  const update = vi.fn().mockReturnValue({
    eq: () => ({
      select: () => ({ single: () => Promise.resolve({ data: stored, error: null }) }),
    }),
  });
  const rows: Record<string, unknown> = {
    crews: stored,
    games: { ruleset_id: 'r1' },
    rulesets: {
      id: 'r1',
      created_by: 'gm',
      name: 'BitD',
      description: null,
      version: '1',
      content: { crew: CREW_RULES },
      schema_version: '1',
      status: 'published',
      is_public: false,
      tags: [],
      compatibility_flags: {},
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  };
  const from = vi.fn((table: string) => ({
    select: () => ({
      eq: () => ({
        single: () =>
          Promise.resolve(
            table === failTable
              ? { data: null, error: { message: `${table} unreadable` } }
              : { data: rows[table], error: null }
          ),
      }),
    }),
    update,
  }));
  const c = { schema: vi.fn().mockReturnValue({ from }) } as unknown as SupabaseClient<Database>;
  return { c, update, from };
}

describe('SupabaseCrewRepository.update — crew ability gate', () => {
  it('refuses a free tick (no advance spent) before writing', async () => {
    const { c, update } = client(crewRow(['crew-second-story'], {}));
    const out = await new SupabaseCrewRepository(c, 'development').update('cr1', {
      crewAbilities: ['crew-second-story', 'crew-network'],
    });
    expect(out.success).toBe(false);
    expect(out.success ? null : out.error.code).toBe('TRACK_NOT_FULL');
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses another crew type’s ability even with a full track', async () => {
    const { c, update } = client(crewRow(['crew-second-story'], { 'crew-xp': 8 }));
    const out = await new SupabaseCrewRepository(c, 'development').update('cr1', {
      crewAbilities: ['crew-second-story', 'crew-deadly'],
      resources: { 'crew-xp': 0 },
    });
    expect(out.success ? null : out.error.code).toBe('ABILITY_LOCKED');
    expect(update).not.toHaveBeenCalled();
  });

  it('writes a legal advance (full track spent on an own-list ability)', async () => {
    const { c, update } = client(crewRow(['crew-second-story'], { 'crew-xp': 8 }));
    const out = await new SupabaseCrewRepository(c, 'development').update('cr1', {
      crewAbilities: ['crew-second-story', 'crew-network'],
      resources: { 'crew-xp': 0 },
    });
    expect(out.success).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('lets writes that add no ability through without reading the ruleset', async () => {
    const { c, update, from } = client(crewRow(['crew-second-story', 'crew-deadly'], {}));
    const out = await new SupabaseCrewRepository(c, 'development').update('cr1', {
      crewAbilities: ['crew-second-story'],
    });
    expect(out.success).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalledWith('rulesets');
    // Non-ability writes skip the gate entirely.
    await new SupabaseCrewRepository(c, 'development').update('cr1', { heat: 2 });
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('gates upgrade boxes too: a mark without a spent track is refused', async () => {
    const free = client(crewRow(['crew-second-story'], {}));
    const refused = await new SupabaseCrewRepository(free.c, 'development').update('cr1', {
      resources: { 'crew-upgrade:crew-mastery': 2 },
    });
    expect(refused.success).toBe(false);
    expect(free.update).not.toHaveBeenCalled();
  });

  it('a stored crew or ruleset it cannot read refuses the write (never judged blind)', async () => {
    for (const table of ['crews', 'games', 'rulesets']) {
      const { c, update } = client(crewRow(['crew-second-story'], { 'crew-xp': 8 }), table);
      const out = await new SupabaseCrewRepository(c, 'development').update('cr1', {
        crewAbilities: ['crew-second-story', 'crew-network'],
        resources: { 'crew-xp': 0 },
      });
      expect(out.success, table).toBe(false);
      expect(update).not.toHaveBeenCalled();
    }
  });

  it('judges a same-patch crew-type change against the NEW type', async () => {
    const { c, update } = client(crewRow([], {}));
    const out = await new SupabaseCrewRepository(c, 'development').update('cr1', {
      crewType: 'assassins',
      crewAbilities: ['crew-deadly'],
    });
    expect(out.success).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
