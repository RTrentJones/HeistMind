// F94 coverage ratchet: the invitation / membership / ruleset / game repositories' query shapes +
// Result mapping against a chainable PostgREST stub (every builder method returns the chain; the
// chain is awaitable and resolves to the queued response). RLS/RPC behaviour itself is proven
// live by the e2e suites; these pin the client-side contract.
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import { SupabaseGamePlayerRepository } from './supabase-game-player-repository';
import { SupabaseGameRepository } from './supabase-game-repository';
import { SupabaseInvitationRepository } from './supabase-invitation-repository';
import { SupabaseRulesetRepository } from './supabase-ruleset-repository';

type Resp = { data: unknown; error: { message: string; code?: string } | null };
const ok = (data: unknown): Resp => ({ data, error: null });
const fail = (message: string, code?: string): Resp => ({ data: null, error: { message, code } });

/** A client whose every query resolves to the next queued response (in call order). */
function stub(...responses: Resp[]) {
  const queue = [...responses];
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const next = () => queue.shift() ?? ok(null);
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'insert', 'update', 'delete', 'order', 'limit', 'is']) {
    chain[m] = (...args: unknown[]) => {
      calls.push({ method: m, args });
      return chain;
    };
  }
  chain.single = () => Promise.resolve(next());
  chain.maybeSingle = () => Promise.resolve(next());
  chain.then = (res: (v: Resp) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve(next()).then(res, rej);
  const db = {
    from: vi.fn((t: string) => (calls.push({ method: 'from', args: [t] }), chain)),
    rpc: vi.fn(
      (fn: string, args: unknown) => (
        calls.push({ method: 'rpc', args: [fn, args] }), Promise.resolve(next())
      )
    ),
  };
  const client = {
    schema: vi.fn().mockReturnValue(db),
    from: db.from,
  } as unknown as SupabaseClient<Database>;
  return { client, calls, db };
}

const TS = '2026-10-17T00:00:00Z';
const INV = {
  id: 'i1',
  game_id: 'g1',
  invited_by: 'gm',
  invited_player: null,
  invite_code: 'AB12CD34',
  expires_at: null,
  max_uses: 20,
  used_count: 3,
  status: 'pending',
  created_at: TS,
  responded_at: null,
};
const GP = { id: 'gp1', game_id: 'g1', player_id: 'p1', role: 'player', status: 'active' };
const RS = {
  id: 'r1',
  created_by: 'gm',
  name: 'Brackwater',
  version: '1.0.0',
  content: {},
  created_at: TS,
  updated_at: TS,
};
const GAME = {
  id: 'g1',
  created_by: 'gm',
  ruleset_id: 'r1',
  name: 'Docks',
  state: 'draft',
  created_at: TS,
  updated_at: TS,
};

describe('SupabaseInvitationRepository', () => {
  it('create generates an unambiguous 8-char code for a public invite', async () => {
    const { client, calls } = stub(ok(INV));
    const out = await new SupabaseInvitationRepository(client, 'development').create('gm', {
      gameId: 'g1',
      maxUses: 20,
    });
    expect(out.success && out.data.inviteCode).toBe('AB12CD34');
    const insert = calls.find(c => c.method === 'insert')?.args[0] as { invite_code: string };
    expect(insert.invite_code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
  });

  it('reads by id / game / player / code; a missing row is null, not an error', async () => {
    const repo = (r: Resp) => new SupabaseInvitationRepository(stub(r).client, 'development');
    expect((await repo(ok(INV)).findById('i1')).success).toBe(true);
    expect(await repo(fail('none', 'PGRST116')).findById('nope')).toEqual({
      success: true,
      data: null,
    });
    expect((await repo(fail('boom')).findById('x')).success).toBe(false);
    const byGame = await repo(ok([INV])).findByGame('g1');
    expect(byGame.success && byGame.data[0]?.usedCount).toBe(3);
    expect((await repo(fail('boom')).findByGame('g1')).success).toBe(false);
    expect((await repo(ok([])).findByPlayer('p1')).success).toBe(true);
    expect((await repo(fail('boom')).findByPlayer('p1')).success).toBe(false);
    expect((await repo(ok(INV)).findByCode('AB12CD34')).success).toBe(true);
    expect(await repo(fail('none', 'PGRST116')).findByCode('ZZ')).toEqual({
      success: true,
      data: null,
    });
    expect((await repo(fail('boom')).findByCode('ZZ')).success).toBe(false);
  });

  it('accept / decline go through the invitee RPCs; revoke is a GM status update', async () => {
    const a = stub(ok(GP));
    expect(
      (await new SupabaseInvitationRepository(a.client, 'development').accept('i1', 'p1')).success
    ).toBe(true);
    expect(a.calls.find(c => c.method === 'rpc')?.args[0]).toBe('accept_invitation');
    const d = stub(ok(INV));
    expect(
      (await new SupabaseInvitationRepository(d.client, 'development').decline('i1', 'p1')).success
    ).toBe(true);
    expect(d.calls.find(c => c.method === 'rpc')?.args[0]).toBe('decline_invitation');
    const r = stub(ok({ ...INV, status: 'revoked' }));
    const revoked = await new SupabaseInvitationRepository(r.client, 'development').revoke(
      'i1',
      'gm'
    );
    expect(revoked.success && revoked.data.status).toBe('revoked');
    expect(r.calls.find(c => c.method === 'update')?.args[0]).toMatchObject({ status: 'revoked' });
    for (const call of ['accept', 'decline', 'revoke'] as const) {
      const out = await new SupabaseInvitationRepository(
        stub(fail('denied', '42501')).client,
        'development'
      )[call]('i1', 'u');
      expect(out.success).toBe(false);
    }
  });

  it('joinViaCode: empty code is a validation error; an RPC error surfaces; no row fails', async () => {
    const repo = (r: Resp) => new SupabaseInvitationRepository(stub(r).client, 'development');
    expect((await repo(ok(GP)).joinViaCode({ gameId: '', inviteCode: '' }, 'u')).success).toBe(
      false
    );
    const err = await repo(fail('Join code was revoked', 'P0002')).joinViaCode(
      { gameId: '', inviteCode: 'x' },
      'u'
    );
    expect(!err.success && err.error.message).toBe('Join code was revoked');
    expect((await repo(ok(null)).joinViaCode({ gameId: '', inviteCode: 'x' }, 'u')).success).toBe(
      false
    );
  });
});

describe('SupabaseGamePlayerRepository', () => {
  const repo = (...r: Resp[]) => new SupabaseGamePlayerRepository(stub(...r).client, 'development');
  it('reads membership and answers isGameMaster from games.created_by', async () => {
    expect((await repo(ok([GP])).findByGame('g1')).success).toBe(true);
    expect((await repo(fail('x')).findByGame('g1')).success).toBe(false);
    expect((await repo(ok([GP])).findByPlayer('p1')).success).toBe(true);
    expect((await repo(fail('x')).findByPlayer('p1')).success).toBe(false);
    expect(await repo(ok([{ id: 'g1' }])).isGameMaster('gm', 'g1')).toEqual({
      success: true,
      data: true,
    });
    expect(await repo(ok([])).isGameMaster('p1', 'g1')).toEqual({ success: true, data: false });
    expect((await repo(fail('x')).isGameMaster('p1', 'g1')).success).toBe(false);
  });
  it('addPlayer / updateStatus map rows and errors', async () => {
    expect((await repo(ok(GP)).addPlayer('g1', 'p1', 'gm')).success).toBe(true);
    expect((await repo(fail('x', '42501')).addPlayer('g1', 'p1', 'gm')).success).toBe(false);
    expect(
      (await repo(ok({ ...GP, status: 'inactive' })).updateStatus('g1', 'p1', 'inactive')).success
    ).toBe(true);
    expect((await repo(fail('x')).updateStatus('g1', 'p1', 'inactive')).success).toBe(false);
    expect(
      (await repo(fail('Only the GM can remove players', '42501')).removePlayer('g1', 'p1')).success
    ).toBe(false);
    expect((await repo(ok(null)).leave('g1', 'bye')).success).toBe(true);
  });
});

describe('SupabaseRulesetRepository + SupabaseGameRepository', () => {
  it('ruleset create / read / update', async () => {
    const r = (x: Resp) => new SupabaseRulesetRepository(stub(x).client, 'development');
    const created = await r(ok(RS)).create('gm', {
      name: 'Brackwater',
      version: '1.0.0',
      content: {} as never,
    });
    expect(created.success && created.data.name).toBe('Brackwater');
    expect(
      (
        await r(fail('dup', '23505')).create('gm', {
          name: 'x',
          version: '1',
          content: {} as never,
        })
      ).success
    ).toBe(false);
    expect((await r(ok(RS)).findById('r1')).success).toBe(true);
    expect(await r(fail('none', 'PGRST116')).findById('r9')).toEqual({ success: true, data: null });
    expect((await r(fail('x')).findById('r9')).success).toBe(false);
    expect((await r(ok([RS])).findByCreator('gm')).success).toBe(true);
    expect((await r(fail('x')).findByCreator('gm')).success).toBe(false);
    expect((await r(ok(RS)).update('r1', 'gm', { version: '1.1.0' })).success).toBe(true);
    expect((await r(fail('x')).update('r1', 'gm', { version: '1.1.0' })).success).toBe(false);
  });

  it('game create / read / lifecycle', async () => {
    const g = (x: Resp) => new SupabaseGameRepository(stub(x).client, 'development');
    expect(
      (await g(ok(GAME)).create('gm', { name: 'Docks', rulesetId: 'r1' } as never)).success
    ).toBe(true);
    expect(
      (await g(fail('x')).create('gm', { name: 'Docks', rulesetId: 'r1' } as never)).success
    ).toBe(false);
    expect((await g(ok(GAME)).findById('g1')).success).toBe(true);
    expect(await g(fail('none', 'PGRST116')).findById('g9')).toEqual({ success: true, data: null });
    expect((await g(fail('x')).findById('g9')).success).toBe(false);
    expect((await g(ok([GAME])).findByCreator('gm')).success).toBe(true);
    expect((await g(fail('x')).findByCreator('gm')).success).toBe(false);
    const moved = await g(ok({ ...GAME, state: 'active' })).updateState('g1', 'gm', 'active');
    expect(moved.success && moved.data.state).toBe('active');
    expect((await g(fail('x')).updateState('g1', 'gm', 'active')).success).toBe(false);
  });
});
