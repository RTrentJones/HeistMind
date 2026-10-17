// F94 — membership controls under the 00022 RLS + 00023 RPCs, driven as GM + player (throwaway
// personas). The GM removes a player (status 'removed': gone from the roster, can't rejoin with
// the code); a player leaves (row deleted: can rejoin). Either way the member's characters go
// back to them as standalone — and still open (they keep a readable copy of the ruleset). Both
// actions are two-click confirms and land in the campaign log. API-level: a player can't remove
// anyone or revoke codes, and the GM can't "leave" their own campaign.
import { createClient } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { getE2EEnv, hasAdminAuth, isLocalStack } from '../support/env';
import { campaignWithJoinCode, joinViaLink } from '../support/campaign';
import { buildCampaignBrackwater } from '../support/characters';
import { throwawayPage } from '../support/personas';
import { uniqueName } from '../support/rulesets';
import { mintAccessToken } from '../support/supabase-admin';

test.describe.configure({ timeout: 240_000 });

/** The character opens from My Characters as a standalone sheet (ruleset still readable). */
async function expectStandaloneAndOpens(page: Page, name: string) {
  await page.goto('/characters');
  const card = page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name, exact: true }) });
  await expect(card.getByText('Standalone').first()).toBeVisible({ timeout: 15_000 });
  await card.getByRole('link', { name: 'Open' }).last().click();
  await page.waitForURL(/\/characters\/[0-9a-f-]+$/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible({ timeout: 15_000 });
}

test.describe('membership controls', () => {
  test.beforeEach(() => {
    test.skip(!isLocalStack() || !hasAdminAuth(), 'Requires the local Supabase stack.');
  });

  test('GM removes a player: roster, log, standalone character, no rejoin', async ({ browser }) => {
    const gm = await throwawayPage(browser);
    const player = await throwawayPage(browser);
    try {
      const campaign = await campaignWithJoinCode(gm.page, 'Kick Job');
      await joinViaLink(player.page, campaign);
      const charName = uniqueName('Kicked Knife');
      await buildCampaignBrackwater(player.page, campaign.hubUrl, charName);

      // GM: the Players panel lists the player; Remove is a two-click confirm.
      await gm.page.goto(campaign.hubUrl);
      const name = player.user.username;
      const members = gm.page.getByRole('list', { name: 'Campaign members' });
      await expect(members.getByText(name, { exact: true })).toBeVisible({ timeout: 15_000 });
      const remove = members.getByRole('button', { name: `Remove ${name} from the campaign` });
      await remove.click();
      await members.getByRole('button', { name: `Remove ${name}?` }).click();
      await expect(gm.page.getByText(`${name} was removed from the campaign`)).toBeVisible();
      await expect(members.getByText(name, { exact: true })).toHaveCount(0, { timeout: 15_000 });
      await expect(gm.page.getByTestId('removed-members')).toContainText(name);
      // The feed records it; the roster no longer carries their character.
      await expect(gm.page.getByText('was removed from the campaign by the GM')).toBeVisible({
        timeout: 15_000,
      });
      await expect(gm.page.getByRole('heading', { name: charName, exact: true })).toHaveCount(0);

      // Player: the character is theirs, standalone, and still opens.
      await expectStandaloneAndOpens(player.page, charName);
      // The campaign is gone from their list, and the invite link can't add them back.
      await player.page.goto('/games');
      await expect(player.page.getByRole('heading', { name: campaign.name })).toHaveCount(0);
      await player.page.goto(`/join/${campaign.code}`);
      await expect(player.page.getByTestId('join-error')).toHaveAttribute(
        'data-reason',
        'removed',
        { timeout: 20_000 }
      );
    } finally {
      await player.dispose();
      await gm.dispose();
    }
  });

  test('a player leaves: log note, standalone character, and may rejoin', async ({ browser }) => {
    const gm = await throwawayPage(browser);
    const player = await throwawayPage(browser);
    try {
      const campaign = await campaignWithJoinCode(gm.page, 'Leave Job');
      await joinViaLink(player.page, campaign);
      const charName = uniqueName('Leaving Lark');
      await buildCampaignBrackwater(player.page, campaign.hubUrl, charName);

      await player.page.goto(campaign.hubUrl);
      await player.page.getByRole('button', { name: 'Leave campaign' }).click();
      await player.page.getByRole('button', { name: 'Confirm: leave campaign' }).click();
      await expect(player.page.getByText('You left the campaign')).toBeVisible({ timeout: 15_000 });
      await player.page.waitForURL(/\/games$/, { timeout: 15_000 });
      await expect(player.page.getByRole('heading', { name: campaign.name })).toHaveCount(0);

      await gm.page.goto(campaign.hubUrl);
      const members = gm.page.getByRole('list', { name: 'Campaign members' });
      await expect(members.getByText(player.user.username, { exact: true })).toHaveCount(0, {
        timeout: 15_000,
      });
      await expect(gm.page.getByText('left the campaign', { exact: true })).toBeVisible({
        timeout: 15_000,
      });

      await expectStandaloneAndOpens(player.page, charName);
      // Leaving isn't a kick: the link works again.
      await joinViaLink(player.page, campaign);
    } finally {
      await player.dispose();
      await gm.dispose();
    }
  });

  test('API: players cannot remove members or revoke codes; the GM cannot leave', async ({
    browser,
  }) => {
    const env = getE2EEnv();
    const gm = await throwawayPage(browser);
    const player = await throwawayPage(browser);
    const other = await throwawayPage(browser);
    try {
      const campaign = await campaignWithJoinCode(gm.page, 'RLS Members');
      await joinViaLink(player.page, campaign);
      await joinViaLink(other.page, campaign);

      const client = async (u: typeof player.user) =>
        createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
          auth: { autoRefreshToken: false, persistSession: false },
          db: { schema: env.heistmindSchema },
          global: { headers: { Authorization: `Bearer ${await mintAccessToken(env, u)}` } },
        });
      const asPlayer = await client(player.user);
      const asGm = await client(gm.user);

      // A player can't kick another player or the GM (the RPC re-checks GM authority)…
      for (const target of [other.user.id, gm.user.id]) {
        const res = await asPlayer.rpc('remove_game_player', {
          p_game_id: campaign.gameId,
          p_player_id: target,
          p_note: null,
        });
        expect(res.error?.code).toBe('42501');
      }
      // …nor flip a membership row directly, nor revoke the GM's join code.
      const flip = await asPlayer
        .from('game_players')
        .update({ status: 'removed' })
        .eq('game_id', campaign.gameId)
        .eq('player_id', other.user.id)
        .select();
      expect(flip.data ?? []).toHaveLength(0);
      const revoke = await asPlayer
        .from('invitations')
        .update({ status: 'revoked' })
        .eq('game_id', campaign.gameId)
        .select();
      expect(revoke.data ?? []).toHaveLength(0);

      // The GM can't leave (they delete the campaign instead) and can't remove themselves.
      const leave = await asGm.rpc('leave_game', { p_game_id: campaign.gameId, p_note: null });
      expect(leave.error?.message).toMatch(/can't leave their own campaign/i);
      const self = await asGm.rpc('remove_game_player', {
        p_game_id: campaign.gameId,
        p_player_id: gm.user.id,
        p_note: null,
      });
      expect(self.error?.message).toMatch(/can't remove themselves/i);

      // Everyone is still an active member.
      const rows = await asGm
        .from('game_players')
        .select('player_id, status')
        .eq('game_id', campaign.gameId);
      expect((rows.data ?? []).every(r => r.status === 'active')).toBe(true);
      expect(rows.data ?? []).toHaveLength(3);
    } finally {
      await other.dispose();
      await player.dispose();
      await gm.dispose();
    }
  });
});
