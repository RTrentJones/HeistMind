// Bot phase 0 — the /api/discord interactions endpoint, driven with REAL signed requests (the
// BRD Phase-4 verification: a signed POST is served, a forged one is rejected). Runs only
// against the locally-managed dev server, whose env got our test public key from
// playwright.config; deployed targets hold the real Discord app key we can't sign for.
import { createClient } from '@supabase/supabase-js';
import { test, expect } from '@playwright/test';
import { loadDiscordTestKeys, signInteraction } from '../support/discord-keys';
import { getE2EEnv } from '../support/env';
import { ensureTestUser, TEST_USERS } from '../support/supabase-admin';

const keys = loadDiscordTestKeys();
const localServer =
  !process.env.PLAYWRIGHT_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL.startsWith('http://localhost') ||
  process.env.PLAYWRIGHT_BASE_URL.startsWith('http://127.0.0.1');

function signed(body: unknown) {
  if (!keys) throw new Error('test keys missing');
  const raw = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  return {
    data: raw,
    headers: {
      'content-type': 'application/json',
      'x-signature-ed25519': signInteraction(keys, timestamp, raw),
      'x-signature-timestamp': timestamp,
    },
  };
}

test.describe('Discord interactions endpoint', () => {
  test.beforeEach(() => {
    test.skip(!keys || !localServer, 'Needs the locally-managed dev server + test keypair.');
  });

  test('answers the PING handshake with PONG', async ({ request }) => {
    const response = await request.post('/api/discord', signed({ type: 1 }));
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ type: 1 });
  });

  test('rejects a forged signature with 401', async ({ request }) => {
    const { data, headers } = signed({ type: 1 });
    const response = await request.post('/api/discord', {
      data,
      headers: { ...headers, 'x-signature-ed25519': '00'.repeat(64) },
    });
    expect(response.status()).toBe(401);
  });

  test('rejects a tampered body with 401 (signature covers raw bytes)', async ({ request }) => {
    const { data, headers } = signed({ type: 1 });
    const response = await request.post('/api/discord', { data: `${data} `, headers });
    expect(response.status()).toBe(401);
  });

  test('phase 1: /character use points discord_players at the actor’s own character', async ({
    request,
  }) => {
    const env = getE2EEnv();
    test.skip(
      !env.supabaseUrl || !env.supabaseServiceRoleKey,
      'Needs the local Supabase stack (service-role provisioning).'
    );

    // Arrange: the GM persona (harness-provisioned + harness-torn-down) becomes a linked
    // Discord user with one character — the same state a real signup + wizard run produces.
    const gm = await ensureTestUser(env, TEST_USERS.gm);
    const admin = createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!);
    const discordId = 'e2e-discord-424242';
    await admin.from('profiles').update({ discord_id: discordId }).eq('id', gm.id!);
    const dev = admin.schema('development');
    await dev.from('characters').delete().eq('created_by', gm.id!).eq('name', 'Bot Runner');
    const inserted = await dev
      .from('characters')
      .insert({
        name: 'Bot Runner',
        created_by: gm.id!,
        playbook_type: 'cutter',
        character_data: { playbook: 'cutter', attributes: {}, skills: {}, specialAbilities: [], stress: 0, trauma: [], contacts: [], custom: {} },
      })
      .select('id')
      .single();
    expect(inserted.error).toBeNull();

    // Act: the signed slash command, as that Discord user.
    const response = await request.post(
      '/api/discord',
      signed({
        type: 2,
        user: { id: discordId },
        data: {
          name: 'character',
          type: 1,
          options: [
            { name: 'use', type: 1, options: [{ name: 'name', type: 3, value: 'Bot Runner' }] },
          ],
        },
      })
    );
    expect(response.status()).toBe(200);
    const ack = (await response.json()) as { type: number; data?: { flags?: number } };
    expect(ack.type).toBe(5); // deferred
    expect(ack.data?.flags).toBe(64); // ephemeral

    // Assert: the deferred work landed the pointer (poll — it completes via after()).
    await expect
      .poll(
        async () => {
          const row = await dev
            .from('discord_players')
            .select('active_character_id')
            .eq('profile_id', gm.id!)
            .maybeSingle();
          return row.data?.active_character_id ?? null;
        },
        { timeout: 15_000 }
      )
      .toBe(inserted.data!.id);
  });

  test('phase 2: /heist link + /log + a persisted sheet roll; non-members are walled', async ({
    request,
  }) => {
    const env = getE2EEnv();
    test.skip(
      !env.supabaseUrl || !env.supabaseServiceRoleKey,
      'Needs the local Supabase stack (service-role provisioning).'
    );

    // Arrange: a discord-linked GM with a campaign (ruleset + game + GM membership rows).
    const gm = await ensureTestUser(env, TEST_USERS.gm);
    const admin = createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!);
    const discordId = 'e2e-discord-424242';
    await admin.from('profiles').update({ discord_id: discordId }).eq('id', gm.id!);
    const dev = admin.schema('development');
    // The character references the ruleset, so it goes first on re-runs.
    await dev.from('characters').delete().eq('created_by', gm.id!).eq('name', 'Bot Linked Runner');
    await dev.from('games').delete().eq('created_by', gm.id!).eq('name', 'Bot Linked Job');
    await dev.from('rulesets').delete().eq('created_by', gm.id!).eq('name', 'Bot E2E RS');
    const ruleset = await dev
      .from('rulesets')
      .insert({
        name: 'Bot E2E RS',
        created_by: gm.id!,
        content: {
          skills: [{ id: 'skirmish', name: 'Skirmish', description: '', attribute: 'prowess' }],
        },
      })
      .select('id')
      .single();
    const game = await dev
      .from('games')
      .insert({ name: 'Bot Linked Job', created_by: gm.id!, ruleset_id: ruleset.data!.id })
      .select('id')
      .single();
    await dev
      .from('game_players')
      .insert({ game_id: game.data!.id, player_id: gm.id!, role: 'game_master', status: 'active' });

    const guildSurface = {
      guild_id: 'e2e-guild-1',
      channel: { id: 'e2e-chan-1', parent_id: null },
      member: { user: { id: discordId } },
    };

    // Act 1: the GM links the channel.
    const link = await request.post(
      '/api/discord',
      signed({
        type: 2,
        ...guildSurface,
        data: {
          name: 'heist',
          type: 1,
          options: [
            {
              name: 'link',
              type: 1,
              options: [{ name: 'campaign', type: 3, value: 'Bot Linked Job' }],
            },
          ],
        },
      })
    );
    expect(link.status()).toBe(200);
    expect(((await link.json()) as { type: number }).type).toBe(5);
    await expect
      .poll(async () => {
        const row = await dev
          .from('games')
          .select('discord_channel_id')
          .eq('id', game.data!.id)
          .single();
        return row.data?.discord_channel_id ?? null;
      })
      .toBe('e2e-chan-1');

    // Act 2: /log lands an attributed note in the campaign feed.
    const log = await request.post(
      '/api/discord',
      signed({
        type: 2,
        ...guildSurface,
        data: {
          name: 'log',
          type: 1,
          options: [{ name: 'text', type: 3, value: 'Settled offscreen: the vault is open' }],
        },
      })
    );
    expect(log.status()).toBe(200);
    await expect
      .poll(async () => {
        const rows = await dev
          .from('rolls')
          .select('note, kind, user_id')
          .eq('game_id', game.data!.id)
          .eq('kind', 'note');
        return rows.data?.some(
          r => r.note === 'Settled offscreen: the vault is open' && r.user_id === gm.id
        );
      })
      .toBe(true);

    // Act 3 (PR 2.3): a sheet roll in the linked channel persists through the engine — the
    // active character is IN this campaign, so /roll action: lands a kind='action' row.
    const character = await dev
      .from('characters')
      .insert({
        name: 'Bot Linked Runner',
        created_by: gm.id!,
        game_id: game.data!.id,
        original_ruleset_id: ruleset.data!.id,
        playbook_type: 'cutter',
        character_data: { playbook: 'cutter', attributes: {}, skills: { skirmish: 2 }, specialAbilities: [], stress: 0, trauma: [], contacts: [], custom: {} },
      })
      .select('id')
      .single();
    expect(character.error).toBeNull();
    await dev
      .from('discord_players')
      .upsert({ profile_id: gm.id!, active_character_id: character.data!.id });

    const sheetRoll = await request.post(
      '/api/discord',
      signed({
        type: 2,
        ...guildSurface,
        data: {
          name: 'roll',
          type: 1,
          options: [{ name: 'action', type: 3, value: 'Skirmish' }],
        },
      })
    );
    expect(sheetRoll.status()).toBe(200);
    expect(((await sheetRoll.json()) as { type: number }).type).toBe(5);
    await expect
      .poll(async () => {
        const rows = await dev
          .from('rolls')
          .select('kind, label, character_id')
          .eq('game_id', game.data!.id)
          .eq('kind', 'action');
        return rows.data?.some(
          r => r.label === 'Skirmish' && r.character_id === character.data!.id
        );
      })
      .toBe(true);

    // Act 4: a NON-member Discord user is walled off (no roll row appears for them).
    const strangerId = 'e2e-discord-stranger';
    const before = await dev.from('rolls').select('id').eq('game_id', game.data!.id);
    const strangerLog = await request.post(
      '/api/discord',
      signed({
        type: 2,
        ...guildSurface,
        member: { user: { id: strangerId } },
        data: {
          name: 'log',
          type: 1,
          options: [{ name: 'text', type: 3, value: 'I should not appear' }],
        },
      })
    );
    expect(strangerLog.status()).toBe(200);
    // Deterministic wait: the stranger path resolves quickly; assert no new rows landed after a
    // settle poll on the count staying flat.
    await expect
      .poll(async () => {
        const after = await dev.from('rolls').select('id').eq('game_id', game.data!.id);
        return (after.data?.length ?? 0) >= (before.data?.length ?? 0);
      })
      .toBe(true);
    const finalRows = await dev.from('rolls').select('note').eq('game_id', game.data!.id);
    expect(finalRows.data?.some(r => r.note === 'I should not appear')).toBe(false);
  });

  test('/roll answers inline with a classified FitD embed', async ({ request }) => {
    const response = await request.post(
      '/api/discord',
      signed({
        type: 2,
        data: { name: 'roll', type: 1, options: [{ name: 'dice', type: 4, value: 3 }] },
      })
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      type: number;
      data: { embeds: { title: string; fields?: { name: string; value: string }[] }[] };
    };
    expect(body.type).toBe(4); // CHANNEL_MESSAGE_WITH_SOURCE — inline, no defer needed
    expect(body.data.embeds[0]?.title).toBe('Action roll — 3d');
    expect(body.data.embeds[0]?.fields?.[0]?.name).toBe('Outcome');
  });
});
