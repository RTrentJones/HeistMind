// F89 — tenant isolation probed at the API level. tenant-isolation.spec.ts (F75) drives the UI,
// which can't catch an RLS hole: the browser holds the public anon key and its own JWT, so any
// signed-in user can call PostgREST directly with arbitrary filters and bodies. These tests do
// exactly that — two real users (victim GM + attacker) plus the anon key, no service-role
// shortcuts on the asserted path (the admin client only provisions users and reads back truth).
//
// Each case is a regression guard for a hole reproduced in the launch security review and closed
// by migration 00022: self-promotion to GM, un-kicking yourself, anon profile reads + emails as
// usernames, campaigns on someone else's private ruleset, forged rolls, re-homing a character by
// direct UPDATE, the definer-function role oracle, and Discord-link squatting.

import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getE2EEnv, hasAdminAuth, isLocalStack } from '../support/env';
import { deleteTestUser } from '../support/supabase-admin';

const env = getE2EEnv();

test.describe.configure({ mode: 'serial', timeout: 60_000 });

type Persona = {
  id: string;
  email: string;
  password: string;
  db: SupabaseClient;
  pub: SupabaseClient;
};

const opts = { auth: { autoRefreshToken: false, persistSession: false } } as const;

function admin(schema?: string): SupabaseClient {
  return createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
    ...opts,
    ...(schema ? { db: { schema } } : {}),
  });
}

/**
 * A fresh user born through handle_new_user (createUser fires the trigger). `appMeta` is the
 * GoTrue-controlled app_metadata — `DISCORD_APP_META` marks the signup as a verified Discord one,
 * the only way user-metadata `provider_id` becomes `profiles.discord_id` (00024, F95).
 */
async function provision(
  meta: Record<string, unknown>,
  emailTag = 'rls',
  appMeta?: Record<string, unknown>
): Promise<{
  id: string;
  email: string;
  password: string;
}> {
  const email = `e2e-${emailTag}-${randomUUID().slice(0, 8)}@heistmind.test`;
  const password = `E2e-${randomUUID()}`;
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
    ...(appMeta ? { app_metadata: appMeta } : {}),
  });
  if (error || !data.user) throw new Error(`provision failed: ${error?.message ?? 'unknown'}`);
  return { id: data.user.id, email, password };
}

/** The user's own REST clients: env schema (`db`) and public (`pub`), anon key + their JWT. */
async function signIn(u: { id: string; email: string; password: string }): Promise<Persona> {
  const auth = createClient(env.supabaseUrl!, env.supabaseAnonKey!, opts);
  const { data, error } = await auth.auth.signInWithPassword({
    email: u.email,
    password: u.password,
  });
  if (error || !data.session) throw new Error(`sign-in failed: ${error?.message ?? 'no session'}`);
  const headers = { Authorization: `Bearer ${data.session.access_token}` };
  const db = createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    ...opts,
    db: { schema: env.heistmindSchema },
    global: { headers },
  });
  const pub = createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    ...opts,
    global: { headers },
  });
  return { ...u, db, pub };
}

const DISCORD_APP_META = { provider: 'discord', providers: ['discord'] } as const;

async function discordIdOf(userId: string): Promise<string | null | undefined> {
  const row = await admin().from('profiles').select('discord_id').eq('id', userId).maybeSingle();
  expect(row.error).toBeNull();
  return row.data?.discord_id;
}

const created: string[] = [];
let gm: Persona; // victim: owns the private ruleset + campaign
let attacker: Persona; // starts as a non-member; later joins via code
let rulesetId: string;
let gameId: string;
let gmCharacterId: string;
let inviteCode: string;

test.describe('RLS at the API level (F89)', () => {
  test.beforeAll(async () => {
    test.skip(
      !isLocalStack(env),
      'Requires the local Supabase stack (per-env schema + migrations).'
    );
    test.skip(!hasAdminAuth(env), 'Requires the Supabase service-role key.');

    const tag = randomUUID().slice(0, 8);
    const g = await provision({ username: `e2e-rls-gm-${tag}` });
    const a = await provision({ username: `e2e-rls-atk-${tag}` });
    created.push(g.id, a.id);
    gm = await signIn(g);
    attacker = await signIn(a);

    // The victim's legitimate setup, all through their own JWT.
    const rs = await gm.db
      .from('rulesets')
      .insert({
        name: `RLS RS ${tag}`,
        version: '1.0.0',
        content: { metadata: {} },
        created_by: gm.id,
      })
      .select('id')
      .single();
    expect(rs.error).toBeNull();
    rulesetId = rs.data!.id;

    const game = await gm.db
      .from('games')
      .insert({ name: `RLS Game ${tag}`, created_by: gm.id, ruleset_id: rulesetId })
      .select('id')
      .single();
    expect(game.error).toBeNull();
    gameId = game.data!.id;

    const ch = await gm.db
      .from('characters')
      .insert({
        name: `RLS Char ${tag}`,
        created_by: gm.id,
        game_id: gameId,
        original_ruleset_id: rulesetId,
        character_data: {},
        playbook_type: 'cutter',
      })
      .select('id')
      .single();
    expect(ch.error).toBeNull();
    gmCharacterId = ch.data!.id;

    inviteCode = `R${tag.toUpperCase().slice(0, 7)}`;
    const inv = await gm.db
      .from('invitations')
      .insert({ game_id: gameId, invited_by: gm.id, invite_code: inviteCode, max_uses: 20 })
      .select('id')
      .single();
    expect(inv.error).toBeNull();
  });

  test.afterAll(async () => {
    for (const id of created) await deleteTestUser(env, id);
  });

  test('a non-member cannot insert themselves as GM (or as anything)', async () => {
    for (const role of ['game_master', 'player']) {
      const res = await attacker.db
        .from('game_players')
        .insert({ game_id: gameId, player_id: attacker.id, role, status: 'active' });
      expect(res.error?.code).toBe('42501');
    }
    // …and still sees nothing of the campaign.
    const chars = await attacker.db.from('characters').select('id').eq('game_id', gameId);
    expect(chars.data ?? []).toHaveLength(0);
  });

  test('joining goes through redeem_invite_code; a member cannot promote themselves', async () => {
    const joined = await attacker.db.rpc('redeem_invite_code', { p_code: inviteCode });
    expect(joined.error).toBeNull();
    expect((joined.data as { role: string }).role).toBe('player');

    const promote = await attacker.db
      .from('game_players')
      .update({ role: 'game_master' })
      .eq('game_id', gameId)
      .eq('player_id', attacker.id)
      .select();
    expect(promote.data ?? []).toHaveLength(0);

    // Nor kick the real GM.
    const kick = await attacker.db
      .from('game_players')
      .update({ status: 'removed' })
      .eq('game_id', gameId)
      .eq('player_id', gm.id)
      .select();
    expect(kick.data ?? []).toHaveLength(0);

    const rows = await admin(env.heistmindSchema)
      .from('game_players')
      .select('player_id, role, status')
      .eq('game_id', gameId);
    expect(rows.data).toEqual(
      expect.arrayContaining([
        { player_id: attacker.id, role: 'player', status: 'active' },
        { player_id: gm.id, role: 'game_master', status: 'active' },
      ])
    );
  });

  test('a member cannot steal a character, mint invites, or move a character by UPDATE', async () => {
    const steal = await attacker.db
      .from('characters')
      .update({ created_by: attacker.id })
      .eq('id', gmCharacterId)
      .select();
    expect(steal.data ?? []).toHaveLength(0);

    const invite = await attacker.db
      .from('invitations')
      .insert({ game_id: gameId, invited_by: attacker.id, invite_code: 'STOLEN99', max_uses: 100 });
    expect(invite.error?.code).toBe('42501');

    // The attacker's own standalone character can't be re-homed into a campaign by direct UPDATE
    // (only attach_character_to_game, which checks membership + ruleset).
    const own = await attacker.db
      .from('characters')
      .insert({
        name: `Mine ${randomUUID().slice(0, 6)}`,
        created_by: attacker.id,
        game_id: null,
        original_ruleset_id: rulesetId,
        character_data: {},
        playbook_type: 'cutter',
      })
      .select('id')
      .single();
    expect(own.error).toBeNull();
    const move = await attacker.db
      .from('characters')
      .update({ game_id: gameId })
      .eq('id', own.data!.id)
      .select();
    expect(move.error?.code).toBe('42501');
    // The GM can't re-home their own character that way either.
    const gmMove = await gm.db
      .from('characters')
      .update({ game_id: null })
      .eq('id', gmCharacterId)
      .select();
    expect(gmMove.error?.code).toBe('42501');
  });

  test('forged rolls are refused; honest rolls and recorded results still land', async () => {
    const crit = await attacker.db.from('rolls').insert({
      game_id: gameId,
      user_id: attacker.id,
      kind: 'action',
      dice: 1,
      results: [1],
      outcome: 'crit',
    });
    expect(crit.error?.code).toBe('23514');

    const notMine = await attacker.db.from('rolls').insert({
      game_id: gameId,
      user_id: attacker.id,
      character_id: gmCharacterId,
      kind: 'action',
      dice: 2,
      results: [6, 6],
      outcome: 'crit',
    });
    expect(notMine.error?.code).toBe('42501');

    const honest = await attacker.db.from('rolls').insert({
      game_id: gameId,
      user_id: attacker.id,
      kind: 'action',
      dice: 2,
      results: [6, 6],
      outcome: 'crit',
    });
    expect(honest.error).toBeNull();
    const zero = await attacker.db.from('rolls').insert({
      game_id: gameId,
      user_id: attacker.id,
      kind: 'resistance',
      dice: 2,
      zero_dice: true,
      results: [6, 2],
      outcome: 'bad',
    });
    expect(zero.error).toBeNull();
    const note = await attacker.db.from('rolls').insert({
      game_id: gameId,
      user_id: attacker.id,
      kind: 'note',
      dice: 0,
      results: [],
      outcome: 'bad',
      note: 'Settled at the table: clean getaway',
    });
    expect(note.error).toBeNull();
    // The GM may log against a character in their own campaign.
    const gmLog = await gm.db.from('rolls').insert({
      game_id: gameId,
      user_id: gm.id,
      character_id: gmCharacterId,
      kind: 'fortune',
      dice: 1,
      results: [5],
      outcome: 'partial',
    });
    expect(gmLog.error).toBeNull();
  });

  // Round 5 P2-6 (F103) — an ASSIST costs the helper 1 stress (RAW). A plain write to another
  // player's character is still refused; 00027's charge_assist_stress is the one narrow path:
  // the caller's own recent action roll, a co-member's character, +1 once per roll.
  test('an assist charges a co-member +1 stress through 00027 only — once per roll', async () => {
    const roll = await attacker.db
      .from('rolls')
      .insert({
        game_id: gameId,
        user_id: attacker.id,
        kind: 'action',
        dice: 3,
        results: [5, 2, 1],
        outcome: 'partial',
        note: 'Assisted by the GM (+1d, 1 stress)',
      })
      .select('id')
      .single();
    expect(roll.error).toBeNull();
    const rollId = roll.data!.id as string;

    // The direct write stays closed (RLS: not their character).
    const direct = await attacker.db
      .from('characters')
      .update({ character_data: { stress: 5 } })
      .eq('id', gmCharacterId)
      .select();
    expect(direct.data ?? []).toHaveLength(0);

    const charged = await attacker.db.rpc('charge_assist_stress', {
      p_roll_id: rollId,
      p_character_id: gmCharacterId,
      p_note: 'The GM marked 1 stress for an assist.',
    });
    expect(charged.error).toBeNull();
    expect(charged.data).toBe('charged');

    const truth = await admin(env.heistmindSchema)
      .from('characters')
      .select('character_data')
      .eq('id', gmCharacterId)
      .single();
    expect((truth.data?.character_data as { stress?: number }).stress).toBe(1);
    const logged = await admin(env.heistmindSchema)
      .from('rolls')
      .select('kind, user_id, note')
      .eq('character_id', gmCharacterId)
      .eq('note', 'The GM marked 1 stress for an assist.');
    expect(logged.data).toEqual([
      { kind: 'note', user_id: attacker.id, note: 'The GM marked 1 stress for an assist.' },
    ]);

    // Once per roll; someone else's roll can't be used; anon can't call it at all.
    const replay = await attacker.db.rpc('charge_assist_stress', {
      p_roll_id: rollId,
      p_character_id: gmCharacterId,
    });
    expect(replay.error?.message).toMatch(/already charged/);
    const borrowed = await gm.db.rpc('charge_assist_stress', {
      p_roll_id: rollId,
      p_character_id: gmCharacterId,
    });
    expect(borrowed.error?.message).toMatch(/Roll not found/);
    const anon = createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
      ...opts,
      db: { schema: env.heistmindSchema },
    });
    const anonCall = await anon.rpc('charge_assist_stress', {
      p_roll_id: rollId,
      p_character_id: gmCharacterId,
    });
    expect(anonCall.error).not.toBeNull();
    const after = await admin(env.heistmindSchema)
      .from('characters')
      .select('character_data')
      .eq('id', gmCharacterId)
      .single();
    expect((after.data?.character_data as { stress?: number }).stress).toBe(1);
  });

  test('a kicked player cannot reactivate, delete the kick, or re-redeem the code', async () => {
    const kick = await gm.db
      .from('game_players')
      .update({ status: 'removed' })
      .eq('game_id', gameId)
      .eq('player_id', attacker.id)
      .select();
    expect(kick.error).toBeNull();
    expect(kick.data).toHaveLength(1);

    const back = await attacker.db
      .from('game_players')
      .update({ status: 'active' })
      .eq('game_id', gameId)
      .eq('player_id', attacker.id)
      .select();
    expect(back.data ?? []).toHaveLength(0);

    const erase = await attacker.db
      .from('game_players')
      .delete()
      .eq('game_id', gameId)
      .eq('player_id', attacker.id)
      .select();
    expect(erase.data ?? []).toHaveLength(0);

    const rejoin = await attacker.db.rpc('redeem_invite_code', { p_code: inviteCode });
    expect(rejoin.error).not.toBeNull();

    const row = await admin(env.heistmindSchema)
      .from('game_players')
      .select('status')
      .eq('game_id', gameId)
      .eq('player_id', attacker.id)
      .single();
    expect(row.data?.status).toBe('removed');
  });

  test("a campaign can't be created on someone else's private ruleset", async () => {
    const read = await attacker.db.from('rulesets').select('id').eq('id', rulesetId);
    expect(read.data ?? []).toHaveLength(0);

    const game = await attacker.db.from('games').insert({
      name: `Leech ${randomUUID().slice(0, 6)}`,
      created_by: attacker.id,
      ruleset_id: rulesetId,
    });
    expect(game.error?.code).toBe('42501');
    const after = await attacker.db.from('rulesets').select('id').eq('id', rulesetId);
    expect(after.data ?? []).toHaveLength(0);
  });

  test('Discord link columns and the player count are not client-writable', async () => {
    const squat = await gm.db
      .from('games')
      .update({ discord_guild_id: '123456789012345678' })
      .eq('id', gameId)
      .select();
    expect(squat.error?.code).toBe('42501');
    const count = await gm.db
      .from('games')
      .update({ current_players: 99 })
      .eq('id', gameId)
      .select();
    expect(count.error?.code).toBe('42501');
    // Ordinary GM edits still work.
    const rename = await gm.db
      .from('games')
      .update({ description: 'still editable' })
      .eq('id', gameId)
      .select('id');
    expect(rename.error).toBeNull();
    expect(rename.data).toHaveLength(1);
  });

  test('SECURITY DEFINER helpers: anon is refused, users can only ask about themselves', async () => {
    const anonDb = createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
      ...opts,
      db: { schema: env.heistmindSchema },
    });
    const role = await anonDb.rpc('get_user_game_role', { user_id: gm.id, game_id: gameId });
    expect(role.error?.code).toBe('42501');
    const gmCheck = await anonDb.rpc('is_game_gm', { p_user_id: gm.id, p_game_id: gameId });
    expect(gmCheck.error?.code).toBe('42501');

    // Signed in, a user asking about SOMEONE ELSE gets false (no membership oracle)…
    const oracle = await attacker.db.rpc('is_game_gm', { p_user_id: gm.id, p_game_id: gameId });
    expect(oracle.data).toBe(false);
    // …while asking about themselves still answers truthfully.
    const self = await gm.db.rpc('is_game_gm', { p_user_id: gm.id, p_game_id: gameId });
    expect(self.data).toBe(true);
    // get_user_game_role has no app caller → service-only.
    const roleAuthed = await gm.db.rpc('get_user_game_role', { user_id: gm.id, game_id: gameId });
    expect(roleAuthed.error?.code).toBe('42501');
  });

  test('profiles: anon reads nothing; users edit only their own safe columns', async () => {
    const anon = createClient(env.supabaseUrl!, env.supabaseAnonKey!, opts);
    const anonRead = await anon.from('profiles').select('id, username');
    expect(anonRead.error?.code).toBe('42501');
    // The keepalive Worker's anon probe target stays readable (the project must not pause).
    const probe = await anon.from('keepalive_probe').select('id').limit(1);
    expect(probe.error).toBeNull();
    expect(probe.data).toHaveLength(1);

    // Signed-in users can read other players' display names. (SELECT stays table-level until the
    // F89 follow-up narrows it to PROFILE_COLUMNS with the first development→main promotion —
    // prod's `main` code still selects `*` from this shared table.)
    const names = await attacker.pub
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', gm.id);
    expect(names.error).toBeNull();
    expect(names.data).toHaveLength(1);
    expect(names.data?.[0]?.username).not.toContain('@');

    // discord_id squatting (blocks the victim's signup / hijacks their bot identity) is refused.
    const squat = await attacker.pub
      .from('profiles')
      .update({ discord_id: '555000111' })
      .eq('id', attacker.id);
    expect(squat.error?.code).toBe('42501');
    // Editing your own display name works; someone else's doesn't.
    const rename = await attacker.pub
      .from('profiles')
      .update({ username: `renamed-${randomUUID().slice(0, 6)}` })
      .eq('id', attacker.id)
      .select('id');
    expect(rename.error).toBeNull();
    expect(rename.data).toHaveLength(1);
    const other = await attacker.pub
      .from('profiles')
      .update({ username: 'hijacked' })
      .eq('id', gm.id)
      .select('id');
    expect(other.data ?? []).toHaveLength(0);
  });

  test('the GM can still delete the campaign (FK SET NULL is not blocked by the re-home guard)', async () => {
    const del = await gm.db.from('games').delete().eq('id', gameId).select('id');
    expect(del.error).toBeNull();
    expect(del.data).toHaveLength(1);
    const ch = await gm.db.from('characters').select('game_id').eq('id', gmCharacterId).single();
    expect(ch.data?.game_id).toBeNull();
  });

  test('signup never stores the email as the username, and name collisions cannot fail signup', async () => {
    const tag = randomUUID().slice(0, 8);
    const snowflake = `9${Date.now()}`;
    // Discord-shaped metadata as Supabase's provider writes it — no `username` key.
    const discordMeta = {
      custom_claims: { global_name: `Silks ${tag}` },
      full_name: `silks_${tag}`,
      name: `silks_${tag}#0`,
      provider_id: snowflake,
      sub: snowflake,
      email_verified: true,
    };
    const first = await provision(discordMeta, 'rls-name', DISCORD_APP_META);
    created.push(first.id);
    // Same display name, different Discord account → must still sign up (no 23505).
    const second = await provision(
      { ...discordMeta, provider_id: `${snowflake}1`, sub: `${snowflake}1` },
      'rls-name',
      DISCORD_APP_META
    );
    created.push(second.id);
    // Nothing but an email → a generated handle, never the address.
    const bare = await provision({}, 'rls-bare');
    created.push(bare.id);

    const rows = await admin()
      .from('profiles')
      .select('id, username, discord_id')
      .in('id', [first.id, second.id, bare.id]);
    expect(rows.error).toBeNull();
    const byId = new Map((rows.data ?? []).map(r => [r.id, r]));
    expect(byId.get(first.id)?.username).toBe(`Silks ${tag}`);
    expect(byId.get(first.id)?.discord_id).toBe(snowflake);
    expect(byId.get(second.id)?.username).toMatch(new RegExp(`^Silks ${tag}-`));
    expect(byId.get(bare.id)?.username).toMatch(/^player-[0-9a-f]{8}$/);
    for (const r of rows.data ?? []) expect(r.username).not.toContain('@');
  });
  test('discord_id comes only from a verified Discord identity — an email signup cannot squat it (F95)', async () => {
    const victimSnowflake = `8${Date.now()}`;
    const spoofMeta = {
      provider_id: victimSnowflake,
      sub: victimSnowflake,
      full_name: 'not-silks',
    };

    // The attack, exactly as an outsider would run it: the PUBLIC signup endpoint (anon key),
    // carrying the victim's Discord snowflake in user metadata.
    const email = `e2e-rls-squat-${randomUUID().slice(0, 8)}@heistmind.test`;
    const password = `E2e-${randomUUID()}`;
    const outsider = createClient(env.supabaseUrl!, env.supabaseAnonKey!, opts);
    const signup = await outsider.auth.signUp({ email, password, options: { data: spoofMeta } });
    if (signup.error) {
      // A project with email self-signup turned off (the optional before-user-created hook,
      // 00024 §6) refuses outright — also a pass: no account, no link.
      expect(signup.error.status ?? 0).toBeGreaterThanOrEqual(400);
    }
    const squatterId = signup.data.user?.id;
    if (squatterId) {
      created.push(squatterId);
      expect(
        await discordIdOf(squatterId),
        'user metadata alone must never link Discord'
      ).toBeNull();
    }

    // Signed in, the squatter can't promote themselves either: app_metadata isn't user-writable,
    // and re-asserting the user metadata changes nothing.
    if (squatterId && signup.data.session) {
      const self = createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
        ...opts,
        global: { headers: { Authorization: `Bearer ${signup.data.session.access_token}` } },
      });
      await self.auth.updateUser({ data: spoofMeta });
      expect(await discordIdOf(squatterId)).toBeNull();
    }

    // The real owner signs in with Discord afterwards (GoTrue marks the signup provider=discord)
    // and still gets their link — previously the squatter held it and the victim got NULL.
    const victim = await provision(spoofMeta, 'rls-victim', DISCORD_APP_META);
    created.push(victim.id);
    expect(await discordIdOf(victim.id), 'the verified Discord signup gets its discord_id').toBe(
      victimSnowflake
    );
    // And a second "verified" claimant can't steal a held snowflake.
    const thief = await provision(spoofMeta, 'rls-thief', DISCORD_APP_META);
    created.push(thief.id);
    expect(await discordIdOf(thief.id)).toBeNull();
    expect(await discordIdOf(victim.id)).toBe(victimSnowflake);
  });
});
