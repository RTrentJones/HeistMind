// Phase 4 — loadout + coin/stash + friends/rivals. Loadout is a PER-SCORE choice on the character
// sheet (not the build): pick a load level + items as you go; over-capacity disables the save (the
// system won't offer an illegal loadout). Coin + stash + a close friend/rival stay in the build
// editor's "Gear" tab. All of it surfaces on the sheet and survives a reload. Uses the Brackwater
// starter (it ships equipment with per-item load and playbook contacts).

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 180_000 });

test.describe('GM: loadout, coin & contacts (Brackwater)', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('sets loadout (cap gated), coin/stash, and friend/rival — all persisting', async ({
    gmPage,
  }) => {
    // Load the bundled Brackwater starter and spin up a campaign + a minimal Knife.
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' }).last()).toBeVisible({
      timeout: 30_000,
    });
    const ruleset = { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
    await createCampaign(gmPage, ruleset, uniqueName('The Loadout Job'));

    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/new$/);
    await gmPage.getByLabel('Character name').fill(uniqueName('Burdened'));
    await gmPage.getByRole('button', { name: 'The Knife' }).click();

    const next = gmPage.getByRole('button', { name: 'Next', exact: true });
    await next.click(); // → action ratings (leave at the seeded spread)
    await next.click(); // → special abilities
    // One ability at creation (BitD); swap the seeded Scarred for Bulwark.
    await gmPage.getByRole('button', { name: /Bulwark/ }).click();
    await next.click(); // → Heritage
    await next.click(); // → Background
    await next.click(); // → Vice
    await next.click(); // → Crew Ties
    await next.click(); // → review
    await expect(gmPage.getByRole('heading', { name: /Confirm Crew Member/i })).toBeVisible();
    await gmPage.getByRole('button', { name: 'Create character' }).click();

    await gmPage.waitForURL(/\/games\/[0-9a-f-]+$/, { timeout: 15_000 });
    await gmPage.getByRole('link', { name: 'View' }).first().click();
    await gmPage.waitForURL(/\/characters\/[0-9a-f-]+$/);

    // --- Loadout is now a per-score choice on the sheet (not the build editor). ---
    // Default load is "normal" (cap 5). Heavy Armor (3) + Large Weapon (2) + Climbing Gear (2) = 7.
    await gmPage.getByRole('checkbox', { name: /Heavy Armor/ }).check();
    await gmPage.getByRole('checkbox', { name: /A Large Weapon/ }).check();
    await gmPage.getByRole('checkbox', { name: /Climbing Gear/ }).check();
    await expect(gmPage.getByText('Load 7/5')).toBeVisible();
    await expect(gmPage.getByText(/Over capacity/)).toBeVisible();
    // Rules-driven validity: the system won't OFFER an illegal save — "Save loadout" is disabled
    // while over capacity.
    await expect(gmPage.getByRole('button', { name: 'Save loadout' })).toBeDisabled();

    // Drop back under the cap (5/5) and save the loadout.
    await gmPage.getByRole('checkbox', { name: /Climbing Gear/ }).uncheck();
    await expect(gmPage.getByText('Load 5/5')).toBeVisible();
    await expect(gmPage.getByText(/Over capacity/)).toHaveCount(0);
    await gmPage.getByRole('button', { name: 'Save loadout' }).click();

    // --- Coin / stash / contacts stay in the build editor. ---
    await gmPage.getByRole('button', { name: 'Edit build' }).click();
    await gmPage.getByRole('button', { name: 'Gear', exact: true }).click();
    await gmPage.getByLabel('Coin (carried)').fill('4');
    await gmPage.getByLabel('Stash', { exact: true }).fill('2');
    await gmPage.getByLabel(/Close friend/).selectOption('Vesh');
    await gmPage.getByLabel(/Rival/).selectOption('Old Marrow');
    await gmPage.getByRole('button', { name: 'Save gear' }).click();

    // --- The sheet reflects the loadout (its gauge) + coin/stash/contacts, surviving a reload. ---
    await gmPage.reload();
    await expect(gmPage.getByText('Load 5/5')).toBeVisible({ timeout: 15_000 });
    await expect(gmPage.getByRole('heading', { name: /Gear & Coin/ })).toBeVisible();
    await expect(gmPage.getByText('4 coin')).toBeVisible();
    await expect(gmPage.getByText('2 stash')).toBeVisible();
    await expect(gmPage.getByText('Friend: Vesh')).toBeVisible();
    await expect(gmPage.getByText('Rival: Old Marrow')).toBeVisible();
  });
});
