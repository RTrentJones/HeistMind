// F94 — the launch-product repository surface against a stubbed client: RLS-aware deletes (a
// filtered-out DELETE matches zero rows and must NOT read as success), the membership RPCs, and the
// normalised join-code redeem. (The RLS/RPC behaviour itself is proven live by e2e membership/
// deletion/join-link specs on the local stack.)
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import { SupabaseCharacterRepository } from './supabase-character-repository';
import { SupabaseGameRepository } from './supabase-game-repository';
import { SupabaseGamePlayerRepository } from './supabase-game-player-repository';
import { SupabaseInvitationRepository } from './supabase-invitation-repository';
import { SupabaseRulesetRepository } from './supabase-ruleset-repository';

type Resp = { data: unknown; error: { message: string; code?: string } | null };

function client(deleteResp: Resp, rpcResp: Resp = { data: null, error: null }) {
  const select = vi.fn().mockResolvedValue(deleteResp);
  const eq = vi.fn().mockReturnValue({ select });
  const del = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ delete: del });
  const rpc = vi.fn().mockResolvedValue(rpcResp);
  const db = { from, rpc };
  const c = { schema: vi.fn().mockReturnValue(db) } as unknown as SupabaseClient<Database>;
  return { c, from, del, eq, rpc };
}

const GP_ROW = {
  id: 'gp1',
  game_id: 'g1',
  player_id: 'p2',
  role: 'player',
  status: 'removed',
  joined_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('deletes (RLS-aware)', () => {
  it.each([
    ['characters', SupabaseCharacterRepository],
    ['games', SupabaseGameRepository],
    ['rulesets', SupabaseRulesetRepository],
  ] as const)('%s: a deleted row → success', async (table, Repo) => {
    const { c, from, eq } = client({ data: [{ id: 'x1' }], error: null });
    const out = await new Repo(c, 'development').delete('x1');
    expect(out).toEqual({ success: true, data: undefined });
    expect(from).toHaveBeenCalledWith(table);
    expect(eq).toHaveBeenCalledWith('id', 'x1');
  });

  it('zero rows (RLS filtered it, or it is gone) → NOT_FOUND, never a silent success', async () => {
    const { c } = client({ data: [], error: null });
    const out = await new SupabaseCharacterRepository(c, 'development').delete('x1');
    expect(out.success).toBe(false);
    expect(!out.success && out.error.code).toBe('NOT_FOUND');
  });

  it('a ruleset still in use surfaces the FK code 23503 for the UI to explain', async () => {
    const { c } = client({ data: null, error: { message: 'violates foreign key', code: '23503' } });
    const out = await new SupabaseRulesetRepository(c, 'development').delete('r1');
    expect(!out.success && out.error.code).toBe('23503');
  });
});

describe('membership RPCs', () => {
  it('removePlayer calls remove_game_player with the note and maps the row', async () => {
    const { c, rpc } = client({ data: [], error: null }, { data: GP_ROW, error: null });
    const out = await new SupabaseGamePlayerRepository(c, 'development').removePlayer(
      'g1',
      'p2',
      'removed from the campaign'
    );
    expect(rpc).toHaveBeenCalledWith('remove_game_player', {
      p_game_id: 'g1',
      p_player_id: 'p2',
      p_note: 'removed from the campaign',
    });
    expect(out.success && out.data.status).toBe('removed');
  });

  it('leave calls leave_game (note defaults to null) and surfaces RPC errors', async () => {
    const { c, rpc } = client(
      { data: [], error: null },
      { data: null, error: { message: 'Not a member of this campaign', code: 'P0002' } }
    );
    const out = await new SupabaseGamePlayerRepository(c, 'development').leave('g1');
    expect(rpc).toHaveBeenCalledWith('leave_game', { p_game_id: 'g1', p_note: null });
    expect(!out.success && out.error.message).toContain('Not a member');
  });
});

describe('joinViaCode', () => {
  it('trims + upper-cases the code before the RPC (codes are case-insensitive)', async () => {
    const { c, rpc } = client(
      { data: [], error: null },
      { data: { ...GP_ROW, status: 'active' }, error: null }
    );
    const out = await new SupabaseInvitationRepository(c, 'development').joinViaCode(
      { gameId: '', inviteCode: '  abcd2345 ' },
      'u1'
    );
    expect(rpc).toHaveBeenCalledWith('redeem_invite_code', { p_code: 'ABCD2345' });
    expect(out.success).toBe(true);
  });
});
