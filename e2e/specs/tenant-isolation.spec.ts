// F75 — multi-tenant RLS isolation, proven end-to-end. The headline guarantee in CLAUDE.md:
// "Multi-tenant data isolation is enforced via Supabase Row Level Security." The two independent
// authenticated contexts (gmPage = campaign owner, playerPage = a different account) let each
// test assert what the OTHER tenant genuinely cannot see or do — through the real client, so the
// anon-key + RLS path is what's exercised (no service-role shortcuts).

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName, uploadRuleset } from '../support/rulesets';

test.describe.configure({ timeout: 120_000 });

test.describe('RLS: tenant isolation', () => {
  // Mutates the per-env schema — local Supabase stack only (matches the journey specs).
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test("a non-member cannot see another GM's campaign", async ({ gmPage, playerPage }) => {
    const ruleset = await uploadRuleset(gmPage, 'cinders.json', uniqueName('Cinders & Coin'));
    const campaignName = uniqueName('Private Campaign');
    const gameUrl = await createCampaign(gmPage, ruleset, campaignName);

    // Not on the player's campaign list…
    await playerPage.goto('/games');
    await expect(playerPage.getByRole('heading', { name: 'Campaigns' })).toBeVisible();
    await expect(playerPage.getByText(campaignName)).toHaveCount(0);

    // …and a DIRECT navigation to the game's URL reads as nonexistent (RLS returns no row —
    // the page can't even distinguish "not yours" from "not there", which is the point).
    await playerPage.goto(new URL(gameUrl).pathname);
    await expect(playerPage.getByText('Game not found')).toBeVisible({ timeout: 15_000 });
    await expect(playerPage.getByRole('heading', { name: campaignName })).toHaveCount(0);
  });

  test('a non-member is denied joining without a valid code', async ({ playerPage }) => {
    await playerPage.goto('/games');
    await playerPage.getByLabel('Invite code').fill('NO-SUCH-CODE');
    await playerPage.getByRole('button', { name: 'Join', exact: true }).click();
    await expect(playerPage.getByText("Couldn't join — check the code and try again.")).toBeVisible(
      { timeout: 10_000 }
    );
    // Still on the list page — no campaign was entered.
    await expect(playerPage).toHaveURL(/\/games$/);
  });

  test('GM-only affordances are not offered to a joined player member', async ({
    gmPage,
    playerPage,
  }) => {
    const ruleset = await uploadRuleset(gmPage, 'cinders.json', uniqueName('Cinders & Coin'));
    const campaignName = uniqueName('Member Gate');
    await createCampaign(gmPage, ruleset, campaignName);
    await gmPage.getByRole('button', { name: 'Create a join code' }).click();
    const codeEl = gmPage.locator('code').first();
    await expect(codeEl).toBeVisible({ timeout: 10_000 });
    const code = (await codeEl.innerText()).trim();

    // Player joins → CAN read the shared campaign hub (membership grants the read)…
    await playerPage.goto('/games');
    await playerPage.getByLabel('Invite code').fill(code);
    await playerPage.getByRole('button', { name: 'Join', exact: true }).click();
    await playerPage.waitForURL(/\/games\/[0-9a-f-]+$/, { timeout: 15_000 });
    await expect(playerPage.getByRole('heading', { name: campaignName })).toBeVisible({
      timeout: 15_000,
    });

    // …but none of the GM-gated controls exist for them:
    // - the campaign lifecycle is a read-only badge, not the state <select> (F32);
    await expect(playerPage.getByLabel('Campaign state')).toHaveCount(0);
    // - no invite-code management;
    await expect(playerPage.getByRole('button', { name: 'Create a join code' })).toHaveCount(0);
    // - no clock creation (the GM's table-state tool).
    await expect(playerPage.getByRole('heading', { name: 'Clocks' })).toBeVisible();
    await expect(playerPage.getByLabel('New clock')).toHaveCount(0);

    // Control: the same controls ARE on the GM's view of the same page (guards against the
    // assertion passing because a label was renamed rather than because the gate works).
    await expect(gmPage.getByLabel('Campaign state')).toBeVisible();
  });
});
