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
