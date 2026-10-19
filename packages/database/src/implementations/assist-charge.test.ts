// Round 5 (F103) / round 6 (P1-1, F105) — `chargeAssistStress` over the `charge_assist_stress` RPC
// (stubbed client; the server-side rules — the helper recorded on the roll, own roll, 15-minute
// window, once per roll, below the base stress max, the server-built note — are proven by SQL
// scenarios on the local stack + the rls-api / assist e2e).
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import { SupabaseRollRepository } from './supabase-roll-repository';

type Resp = { data: unknown; error: { message: string; code?: string } | null };

function repo(resp: Resp) {
  const rpc = vi.fn().mockResolvedValue(resp);
  const c = { schema: vi.fn().mockReturnValue({ rpc }) } as unknown as SupabaseClient<Database>;
  return { repo: new SupabaseRollRepository(c, 'development'), rpc };
}

describe('chargeAssistStress', () => {
  it('calls the RPC with the roll and the helper only — no client note text (00028)', async () => {
    const { repo: r, rpc } = repo({ data: 'charged', error: null });
    const out = await r.chargeAssistStress('r1', 'c9');
    expect(rpc).toHaveBeenCalledWith('charge_assist_stress', {
      p_roll_id: 'r1',
      p_character_id: 'c9',
    });
    expect(out).toEqual({ success: true, data: 'charged' });
  });

  it('passes near_limit through', async () => {
    const { repo: r } = repo({ data: 'near_limit', error: null });
    expect(await r.chargeAssistStress('r1', 'c9')).toEqual({
      success: true,
      data: 'near_limit',
    });
  });

  it('an unexpected payload or an RPC error is a failed Result', async () => {
    expect(
      (await repo({ data: null, error: null }).repo.chargeAssistStress('r', 'c')).success
    ).toBe(false);
    const out = await repo({
      data: null,
      error: { message: "This roll's assist was already charged", code: 'P0001' },
    }).repo.chargeAssistStress('r', 'c');
    expect(!out.success && out.error.message).toBe("This roll's assist was already charged");
  });
});
