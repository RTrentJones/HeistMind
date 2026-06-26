// Phase 3 — async dice roller + campaign roll log. Roll an action on the character sheet; the roll
// is persisted and shows up in the campaign's roll log (the play-by-post feed). Uses the Brackwater
// starter (action-rating mode → the sheet shows action rolls).

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 120_000 });

test.describe('GM: dice rolls + roll log', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('rolls an action on the sheet and it lands in the campaign roll log', async ({ gmPage }) => {
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' })).toBeVisible({
      timeout: 30_000,
    });
    const ruleset = { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
    const gameUrl = await createCampaign(gmPage, ruleset, uniqueName('Dice Test'));

    // Minimal character (Brackwater has 8 steps → 7 Nexts to review; defaults are legal).
    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/new$/);
    await gmPage.getByLabel('Character name').fill('Roller');
    await gmPage.getByRole('button', { name: 'The Knife' }).click();
    for (let i = 0; i < 7; i++)
      await gmPage.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(gmPage.getByRole('heading', { name: /Confirm Crew Member/i })).toBeVisible();
    await gmPage.getByRole('button', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+$/);
    await gmPage.getByRole('link', { name: 'View' }).first().click();
    await gmPage.waitForURL(/\/characters\/[0-9a-f-]+$/);

    // Roll an action from the sheet's Dice panel.
    await expect(gmPage.getByRole('heading', { name: 'Dice' })).toBeVisible();
    await gmPage.getByRole('button', { name: 'Roll', exact: true }).click();
    // Immediate result feedback + an entry in the log (the "[n, …]" faces are unique to the log).
    await expect(gmPage.getByText(/Critical!|Success|Partial|Bad outcome/)).toBeVisible({
      timeout: 10_000,
    });
    await expect(gmPage.getByText(/\[\d/).first()).toBeVisible();

    // The roll is on the campaign's shared, DB-backed log (and survives navigation).
    await gmPage.goto(gameUrl);
    await expect(gmPage.getByRole('heading', { name: 'Roll Log' })).toBeVisible();
    await expect(gmPage.getByText(/\[\d/).first()).toBeVisible({ timeout: 15_000 });
  });
});
