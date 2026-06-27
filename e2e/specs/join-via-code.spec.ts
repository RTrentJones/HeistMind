// A1 — the multiplayer front door: a GM generates a public join code, and a second account redeems
// it on /games and lands in the campaign. The first real two-account (gmPage + playerPage) flow,
// so it also exercises the cross-tenant read path (a joined member viewing a campaign they don't own).

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName, uploadRuleset } from '../support/rulesets';

test.describe.configure({ timeout: 120_000 });

test.describe('Join via invite code', () => {
  // Mutates the per-env schema — local Supabase stack only (matches the journey specs).
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('a GM generates a code and a second account joins with it', async ({
    gmPage,
    playerPage,
  }) => {
    const ruleset = await uploadRuleset(gmPage, 'cinders.json', uniqueName('Cinders & Coin'));
    const campaignName = uniqueName('Join Test');
    await createCampaign(gmPage, ruleset, campaignName); // lands on /games/[id]; gmPage is the creator

    // GM: generate a public join code on the campaign page (InviteCodeSection is GM-only).
    await gmPage.getByRole('button', { name: 'Create a join code' }).click();
    const codeEl = gmPage.locator('code').first();
    await expect(codeEl).toBeVisible({ timeout: 10_000 });
    const code = (await codeEl.innerText()).trim();
    expect(code.length).toBeGreaterThan(0);

    // Player (a different account): redeem the code on /games → land in the campaign.
    await playerPage.goto('/games');
    await playerPage.getByLabel('Invite code').fill(code);
    await playerPage.getByRole('button', { name: 'Join', exact: true }).click();
    await playerPage.waitForURL(/\/games\/[0-9a-f-]+$/, { timeout: 15_000 });
    await expect(playerPage.getByRole('heading', { name: campaignName })).toBeVisible({
      timeout: 15_000,
    });

    // …and the campaign now shows in the player's own list, badged as joined (Player).
    await playerPage.goto('/games');
    await expect(playerPage.getByRole('heading', { name: campaignName })).toBeVisible({
      timeout: 15_000,
    });
    // exact: the username "e2e-player" makes a substring match collide with the header welcome line.
    await expect(playerPage.getByText('Player', { exact: true }).first()).toBeVisible();
  });
});
