import { describe, expect, it } from 'vitest';
import type { GameRole, GameState, InvitationStatus } from '@heist-mind/core';
import type { Database } from './supabase-types';

// Compile-time integrity checks over the generated Supabase types and the core domain unions.
// The real gate is `tsc` (this file lives in src/ so type-check and build both see it); the
// runtime asserts only keep vitest from flagging empty suites. Row↔domain drift is already
// covered by compiling the adapters against the generated Row types — not re-checked here.

type EnvTables = keyof Database['development']['Tables'] & keyof Database['production']['Tables'];

describe('generated schema integrity', () => {
  it('exposes every campaign table in BOTH env schemas (dev/prod parity)', () => {
    // A table present in one env schema but not the other = a migration that only half-landed.
    const tables = [
      'characters',
      'clocks',
      'crews',
      'factions',
      'game_players',
      'games',
      'invitations',
      'rolls',
      'rulesets',
      'scores',
    ] as const satisfies readonly EnvTables[];
    expect(tables.length).toBe(10);
  });

  it('keeps profiles in the shared public schema', () => {
    const profiles = 'profiles' satisfies keyof Database['public']['Tables'];
    expect(profiles).toBe('profiles');
  });
});

describe('core domain unions', () => {
  // Two-way checks: the array proves each member is assignable to the union; the Record proves
  // the union has no member the list forgot (a union addition breaks the Record with a missing key).
  it('GameState matches the canonical lifecycle', () => {
    const states = ['draft', 'recruiting', 'active', 'paused', 'completed'] as const satisfies readonly GameState[];
    const exhaustive: Record<GameState, true> = {
      draft: true,
      recruiting: true,
      active: true,
      paused: true,
      completed: true,
    };
    expect(Object.keys(exhaustive)).toHaveLength(states.length);
  });

  it('GameRole matches the membership roles', () => {
    const roles = ['game_master', 'player', 'co_gm', 'spectator'] as const satisfies readonly GameRole[];
    const exhaustive: Record<GameRole, true> = {
      game_master: true,
      player: true,
      co_gm: true,
      spectator: true,
    };
    expect(Object.keys(exhaustive)).toHaveLength(roles.length);
  });

  it('InvitationStatus matches the invite lifecycle', () => {
    const statuses = [
      'pending',
      'accepted',
      'declined',
      'expired',
      'revoked',
    ] as const satisfies readonly InvitationStatus[];
    const exhaustive: Record<InvitationStatus, true> = {
      pending: true,
      accepted: true,
      declined: true,
      expired: true,
      revoked: true,
    };
    expect(Object.keys(exhaustive)).toHaveLength(statuses.length);
  });
});
