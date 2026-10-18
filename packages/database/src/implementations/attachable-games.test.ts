// UX r3 (F101) — `findAttachableGameIds` over the 00025 `attachable_games_for_character` RPC
// (stubbed client; the compatibility rule itself is proven by SQL scenarios + the
// attach-across-copies e2e on the local stack).
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import { SupabaseCharacterRepository } from './supabase-character-repository';

type Resp = { data: unknown; error: { message: string; code?: string } | null };

function repo(resp: Resp) {
  const rpc = vi.fn().mockResolvedValue(resp);
  const c = { schema: vi.fn().mockReturnValue({ rpc }) } as unknown as SupabaseClient<Database>;
  return { repo: new SupabaseCharacterRepository(c, 'development'), rpc };
}

describe('findAttachableGameIds', () => {
  it('calls the RPC with the character id and returns the scalar uuids', async () => {
    const { repo: r, rpc } = repo({ data: ['g1', 'g2'], error: null });
    const out = await r.findAttachableGameIds('c1');
    expect(rpc).toHaveBeenCalledWith('attachable_games_for_character', { p_character_id: 'c1' });
    expect(out).toEqual({ success: true, data: ['g1', 'g2'] });
  });

  it('accepts the object-row shape too', async () => {
    const { repo: r } = repo({
      data: [{ attachable_games_for_character: 'g3' }],
      error: null,
    });
    expect(await r.findAttachableGameIds('c1')).toEqual({ success: true, data: ['g3'] });
  });

  it('treats a null payload as no targets', async () => {
    const { repo: r } = repo({ data: null, error: null });
    expect(await r.findAttachableGameIds('c1')).toEqual({ success: true, data: [] });
  });

  it('surfaces an RPC error as a failed Result', async () => {
    const { repo: r } = repo({ data: null, error: { message: 'boom', code: 'P0001' } });
    const out = await r.findAttachableGameIds('c1');
    expect(out.success).toBe(false);
    expect(!out.success && out.error.message).toBe('boom');
  });
});
