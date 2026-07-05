// Cross-client parity (audit PR 9) — the highest-value journey: the web UI and the Discord bot
// act on the SAME shared truth. One persona, two clients:
//
//   1. Browser (the trigger-linked `discord` persona): upload a ruleset, create a campaign,
//      build a character through the REAL creation wizard.
//   2. Signed HTTP as the same persona's Discord user: `/character use` the wizard character,
//      `/heist link` the campaign, `/roll action:` (persists via the engine), `/harm take`.
//   3. Browser again: the bot's writes appear in the web campaign feed — the roll entry with
//      its action label, and the harm event with the NEUTRAL 'Harm' kind badge (not a dice
//      outcome badge) — and the harm entry shows on the character sheet.
//
// The harm feed-badge assertion lives HERE because the web cannot create harm events at all —
// only the bot logs `harm` feed events (F65) — so no web-only spec can ever render one.
//
// Gated like discord.spec.ts: the locally-managed dev server (playwright.config injected our
// test public key), the local test keypair, and the service-role admin client for DB polling.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { loadDiscordTestKeys, signInteraction } from '../support/discord-keys';
import { getE2EEnv } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, fixturePath, uniqueName, uploadRuleset } from '../support/rulesets';
import { TEST_USERS } from '../support/supabase-admin';

const keys = loadDiscordTestKeys();
const localServer =
  !process.env.PLAYWRIGHT_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL.startsWith('http://localhost') ||
  process.env.PLAYWRIGHT_BASE_URL.startsWith('http://127.0.0.1');

// The action the bot rolls is derived from the SAME fixture the ruleset is uploaded from —
// `rulesetActions` reads `attributes[].skills` (F69), so this is the canonical action list.
const CINDERS = JSON.parse(readFileSync(fixturePath('cinders.json'), 'utf8')) as {
  attributes: { skills?: string[] }[];
};
const ACTION = CINDERS.attributes[0]!.skills![0]!;

// A parity-spec-private guild surface (distinct from discord.spec's e2e-guild-1, so the two
// files never fight over channel links when the whole suite runs).
const GUILD_ID = 'e2e-guild-parity';
const CHANNEL_ID = 'e2e-chan-parity';

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

// Many routes (upload → new-game → wizard → sheet) each cold-compile on the dev server, plus
// four deferred bot round-trips with DB polls — the default budget is far too tight.
test.describe.configure({ timeout: 180_000 });

test.describe('Cross-client parity: web wizard → bot gameplay → web feed', () => {
  test.beforeEach(() => {
    test.skip(!keys || !localServer, 'Needs the locally-managed dev server + test keypair.');
  });

  test('a wizard-built character plays through the bot and the writes render in the web UI', async ({
    discordPage,
    request,
  }) => {
    const env = getE2EEnv();
    test.skip(
      !env.supabaseUrl || !env.supabaseServiceRoleKey,
      'Needs the local Supabase stack (service-role DB polling).'
    );

    const discordId = TEST_USERS.discord.discordId!;
    const admin = createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!);
    const dev = admin.schema('development');

    // The persona was provisioned by global-setup through the REAL signup trigger (the
    // discordPage fixture guarantees its session exists). Read the trigger-owned link —
    // never hand-write profiles.discord_id (F68).
    const profile = await admin.from('profiles').select('id').eq('discord_id', discordId).single();
    expect(profile.data, 'the signup trigger must have linked the discord persona').toBeTruthy();
    const profileId = profile.data!.id as string;

    // Release the parity guild's links whoever holds them — a leftover link from an earlier
    // aborted run's orphaned game would 23505 the /heist link below (one campaign per channel).
    await dev
      .from('games')
      .update({ discord_guild_id: null, discord_channel_id: null })
      .eq('discord_guild_id', GUILD_ID);

    // ── 1. Browser: ruleset → campaign → the REAL character wizard ────────────────────────
    const ruleset = await uploadRuleset(discordPage, 'cinders.json', uniqueName('Parity Rules'));
    const campaignName = uniqueName('Parity Heist');
    const gameUrl = await createCampaign(discordPage, ruleset, campaignName);
    const gameId = new URL(gameUrl).pathname.split('/').pop()!;

    await discordPage.getByRole('link', { name: 'Create character' }).click();
    await expect(discordPage).toHaveURL(/\/characters\/new$/);

    const charName = uniqueName('Parity Vane');
    await discordPage.getByLabel('Character name').fill(charName);
    await discordPage.getByRole('button', { name: 'The Razor' }).click();
    await discordPage.getByRole('button', { name: 'Next', exact: true }).click(); // → attributes
    await expect(discordPage.getByText(/\/ 7 points spent/)).toBeVisible();
    await discordPage.getByRole('button', { name: 'Next', exact: true }).click(); // → abilities
    await discordPage.getByRole('button', { name: 'Next', exact: true }).click(); // → crew ties
    await discordPage.getByRole('button', { name: 'Loyal' }).click();
    await discordPage.getByRole('button', { name: 'Next', exact: true }).click(); // → identity
    await discordPage.getByRole('button', { name: 'Next', exact: true }).click(); // → review
    await expect(discordPage.getByRole('heading', { name: charName })).toBeVisible();
    await discordPage.getByRole('button', { name: 'Create character' }).click();

    // Landed back on the game page with the character rostered (trigger-assigned GM membership).
    await expect(discordPage).toHaveURL(/\/games\/[0-9a-f-]+$/);
    await expect(discordPage.getByRole('heading', { name: charName })).toBeVisible();

    const created = await dev
      .from('characters')
      .select('id')
      .eq('created_by', profileId)
      .eq('name', charName)
      .single();
    expect(created.error).toBeNull();
    const characterId = created.data!.id as string;

    // ── 2. Signed HTTP: the SAME person plays through the bot ─────────────────────────────
    // 2a. /character use — point the bot at the wizard-built character.
    const use = await request.post(
      '/api/discord',
      signed({
        type: 2,
        user: { id: discordId },
        data: {
          name: 'character',
          type: 1,
          options: [
            { name: 'use', type: 1, options: [{ name: 'name', type: 3, value: charName }] },
          ],
        },
      })
    );
    expect(use.status()).toBe(200);
    const useAck = (await use.json()) as { type: number; data?: { flags?: number } };
    expect(useAck.type).toBe(5); // deferred
    expect(useAck.data?.flags).toBe(64); // ephemeral (account admin)
    await expect
      .poll(
        async () => {
          const row = await dev
            .from('discord_players')
            .select('active_character_id')
            .eq('profile_id', profileId)
            .maybeSingle();
          return row.data?.active_character_id ?? null;
        },
        { timeout: 15_000 }
      )
      .toBe(characterId);

    // 2b. /heist link — bind the campaign to this channel (the actor is its web-created GM).
    const guildSurface = {
      guild_id: GUILD_ID,
      channel: { id: CHANNEL_ID, parent_id: null },
      member: { user: { id: discordId } },
    };
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
              options: [{ name: 'campaign', type: 3, value: campaignName }],
            },
          ],
        },
      })
    );
    expect(link.status()).toBe(200);
    expect(((await link.json()) as { type: number }).type).toBe(5);
    await expect
      .poll(
        async () => {
          const row = await dev
            .from('games')
            .select('discord_channel_id')
            .eq('id', gameId)
            .single();
          return row.data?.discord_channel_id ?? null;
        },
        { timeout: 15_000 }
      )
      .toBe(CHANNEL_ID);

    // 2c. /roll action: — the sheet roll persists through the engine (linked + member + own
    // campaign), landing a kind='action' feed row labeled with the ruleset's canonical action.
    const roll = await request.post(
      '/api/discord',
      signed({
        type: 2,
        ...guildSurface,
        data: {
          name: 'roll',
          type: 1,
          options: [{ name: 'action', type: 3, value: ACTION }],
        },
      })
    );
    expect(roll.status()).toBe(200);
    expect(((await roll.json()) as { type: number }).type).toBe(5);
    await expect
      .poll(
        async () => {
          const rows = await dev
            .from('rolls')
            .select('kind, label, character_id')
            .eq('game_id', gameId)
            .eq('kind', 'action');
          return (
            rows.data?.some(r => r.label === ACTION && r.character_id === characterId) ?? false
          );
        },
        { timeout: 15_000 }
      )
      .toBe(true);

    // 2d. /harm take — the write the web sheet CANNOT produce (F65): engine takeHarm logs a
    // kind='harm' feed event. Fresh character → the lesser track has room → applied at lesser.
    const harm = await request.post(
      '/api/discord',
      signed({
        type: 2,
        ...guildSurface,
        data: {
          name: 'harm',
          type: 1,
          options: [
            {
              name: 'take',
              type: 1,
              options: [
                { name: 'level', type: 3, value: 'lesser' },
                { name: 'description', type: 3, value: 'Parity Bruise' },
              ],
            },
          ],
        },
      })
    );
    expect(harm.status()).toBe(200);
    expect(((await harm.json()) as { type: number }).type).toBe(5);
    const HARM_NOTE = 'Took lesser harm: Parity Bruise';
    await expect
      .poll(
        async () => {
          const rows = await dev
            .from('rolls')
            .select('kind, note, character_id')
            .eq('game_id', gameId)
            .eq('kind', 'harm');
          return (
            rows.data?.some(r => r.note === HARM_NOTE && r.character_id === characterId) ?? false
          );
        },
        { timeout: 15_000 }
      )
      .toBe(true);

    // ── 3. Browser: the bot's writes ARE the web campaign feed ────────────────────────────
    // A full navigation (not client-side cache) so React Query fetches fresh — the DB polls
    // above already proved the after()-completed writes landed.
    await discordPage.goto(gameUrl);
    await expect(discordPage.getByRole('heading', { name: 'Roll Log' })).toBeVisible();

    // The roll entry: labeled with the ruleset action, attributed, wearing a DICE outcome badge.
    await expect(discordPage.getByText(ACTION, { exact: true })).toBeVisible({ timeout: 15_000 });
    const rollEntry = discordPage.locator('div').filter({ hasText: ACTION }).last().locator('..');
    await expect(rollEntry.getByText(/^(crit|success|partial|bad)$/)).toBeVisible();

    // The harm event: the note text, under the NEUTRAL 'Harm' kind badge — never an outcome.
    await expect(discordPage.getByText(HARM_NOTE)).toBeVisible();
    const harmEntry = discordPage
      .locator('div')
      .filter({ hasText: HARM_NOTE })
      .last()
      .locator('..');
    await expect(harmEntry.getByText('Harm', { exact: true })).toBeVisible();
    await expect(harmEntry.getByText(/^(crit|success|partial|bad)$/)).toHaveCount(0);

    // ── 4. The character sheet carries the bot-inflicted harm ─────────────────────────────
    await discordPage.getByRole('link', { name: 'View' }).first().click();
    await expect(discordPage).toHaveURL(/\/characters\/[0-9a-f-]+$/);
    await expect(discordPage.getByRole('heading', { name: charName })).toBeVisible();
    await expect(discordPage.getByText('Parity Bruise', { exact: true })).toBeVisible();
  });
});
