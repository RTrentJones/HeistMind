// The bot-state repository against a stubbed client chain: the one-active-character upsert,
// the missing-row → null read, and the clear. (RLS posture is enforced in migration 00016 and
// checked live; these cover the query shapes + Result mapping.)
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import { SupabaseDiscordPlayerRepository } from './supabase-discord-player-repository';

type Row = { active_character_id: string | null };

function makeRepo(handlers: {
  single?: () => Promise<{ data: Row | null; error: { code?: string; message: string } | null }>;
  upsert?: ReturnType<typeof vi.fn>;
  update?: ReturnType<typeof vi.fn>;
}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: handlers.single ?? vi.fn(),
    upsert: handlers.upsert ?? vi.fn().mockResolvedValue({ error: null }),
    update: handlers.update ?? vi.fn().mockReturnThis(),
  };
  // update().eq() resolves the write.
  if (handlers.update) chain.update = handlers.update;
  const db = { from: vi.fn().mockReturnValue(chain) };
  const client = { schema: vi.fn().mockReturnValue(db) } as unknown as SupabaseClient<Database>;
  return { repo: new SupabaseDiscordPlayerRepository(client, 'development'), chain, db };
}

describe('SupabaseDiscordPlayerRepository', () => {
  it('reads the active character pointer', async () => {
    const { repo } = makeRepo({
      single: () => Promise.resolve({ data: { active_character_id: 'c1' }, error: null }),
    });
    expect(await repo.getActiveCharacterId('p1')).toEqual({ success: true, data: 'c1' });
  });

  it('a profile with no bot state reads as null (not an error)', async () => {
    const { repo } = makeRepo({
      single: () => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'no rows' } }),
    });
    expect(await repo.getActiveCharacterId('p1')).toEqual({ success: true, data: null });
  });

  it('setActiveCharacter upserts on profile_id (one active character, structural)', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const { repo, chain } = makeRepo({ upsert });
    const out = await repo.setActiveCharacter('p1', 'c9');
    expect(out.success).toBe(true);
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ profile_id: 'p1', active_character_id: 'c9' }),
      { onConflict: 'profile_id' }
    );
  });

  it('clearActiveCharacter nulls the pointer and surfaces write errors', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const { repo } = makeRepo({ update });
    expect((await repo.clearActiveCharacter('p1')).success).toBe(true);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ active_character_id: null }));

    const failingEq = vi.fn().mockResolvedValue({ error: { message: 'rls says no' } });
    const failingUpdate = vi.fn().mockReturnValue({ eq: failingEq });
    const { repo: failingRepo } = makeRepo({ update: failingUpdate });
    expect((await failingRepo.clearActiveCharacter('p1')).success).toBe(false);
  });
});
