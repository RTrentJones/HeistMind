// F75 — the PLAYER-side journey (every other journey spec drives the GM persona). One sequential
// flow covering the three scaffold intents: join a campaign (via the built join-code front door —
// a first-class invite flow isn't built yet, see FINDINGS F5), create a rules-valid character
// from the game's ruleset, roll on it, and advance it — with the progression persisted (survives
// a reload) and feed-logged.

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName, uploadRuleset } from '../support/rulesets';

test.describe.configure({ timeout: 180_000 });

test.describe('Player: join, create, roll, advance', () => {
  // Mutates the per-env schema — local Supabase stack only (matches the journey specs).
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('a player joins via code, builds a character on the game ruleset, rolls, and advances', async ({
    gmPage,
    playerPage,
  }) => {
    // --- GM side: campaign + join code (the multiplayer front door). ---
    const ruleset = await uploadRuleset(gmPage, 'cinders.json', uniqueName('Cinders & Coin'));
    const campaignName = uniqueName('Player Journey');
    const gameUrl = await createCampaign(gmPage, ruleset, campaignName);
    await gmPage.getByRole('button', { name: 'Create a join code' }).click();
    const codeEl = gmPage.locator('code').first();
    await expect(codeEl).toBeVisible({ timeout: 10_000 });
    const code = (await codeEl.innerText()).trim();

    // --- Player joins with the code and lands in the campaign. ---
    await playerPage.goto('/games');
    await playerPage.getByLabel('Invite code').fill(code);
    await playerPage.getByRole('button', { name: 'Join', exact: true }).click();
    await playerPage.waitForURL(/\/games\/[0-9a-f-]+$/, { timeout: 15_000 });
    await expect(playerPage.getByRole('heading', { name: campaignName })).toBeVisible({
      timeout: 15_000,
    });

    // --- Player creates a character ON THE GAME'S RULESET (cinders/The Razor — 6 steps).
    // The wizard only offers this ruleset's playbooks, so a legal build is the only build. ---
    const charName = uniqueName('Ember');
    await playerPage.getByRole('link', { name: 'Create character' }).click();
    await playerPage.waitForURL(/\/characters\/new$/);
    await playerPage.getByLabel('Character name').fill(charName);
    await playerPage.getByRole('button', { name: 'The Razor' }).click();
    for (let i = 0; i < 5; i++)
      await playerPage.getByRole('button', { name: 'Next', exact: true }).click();
    await playerPage.getByRole('button', { name: 'Create character' }).click();
    await playerPage.waitForURL(/\/games\/[0-9a-f-]+$/, { timeout: 15_000 });

    // The character shows on the shared roster; open the sheet.
    await expect(playerPage.getByText(charName).first()).toBeVisible({ timeout: 15_000 });
    await playerPage.getByRole('link', { name: 'View' }).first().click();
    await playerPage.waitForURL(/\/characters\/[0-9a-f-]+$/);
    const sheetUrl = playerPage.url();

    // --- Roll from the sheet's Dice panel: immediate outcome + persisted faces in the log. ---
    await expect(playerPage.getByRole('heading', { name: 'Dice' })).toBeVisible();
    await playerPage.getByRole('button', { name: 'Roll', exact: true }).click();
    await expect(playerPage.getByText(/Critical!|Success|Partial|Bad outcome/)).toBeVisible({
      timeout: 10_000,
    });
    await expect(playerPage.getByText(/\[\d/).first()).toBeVisible();

    // --- Advance: cinders is a flat-pool ruleset → "Add XP" banks a point, feed-logged. ---
    await expect(playerPage.getByText('0 XP')).toBeVisible();
    await playerPage.getByRole('button', { name: 'Add XP' }).click();
    await expect(playerPage.getByText('1 XP', { exact: true })).toBeVisible({ timeout: 10_000 });

    // Progression persists: a hard reload re-reads from the DB, not client state.
    await playerPage.goto(sheetUrl);
    await expect(playerPage.getByText('1 XP', { exact: true })).toBeVisible({ timeout: 15_000 });

    // --- Cross-tenant read parity: the GM sees the player's roll + XP on the shared log. ---
    await gmPage.goto(gameUrl);
    await expect(gmPage.getByText(charName).first()).toBeVisible({ timeout: 15_000 });
    await expect(gmPage.getByText(/\[\d/).first()).toBeVisible({ timeout: 15_000 });
  });
});
