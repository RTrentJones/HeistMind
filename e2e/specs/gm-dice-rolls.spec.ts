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
      .getByRole('button', { name: /Add Brackwater to my rulesets|Refresh my Brackwater copy/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' }).last()).toBeVisible({
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

  // F43 — moderate harm surfaces its RAW −1d on the sheet's ACTION roll panel, waivable. Lives
  // here (Brackwater, action-rating mode) because the hint only exists for action rolls — a
  // point-buy ruleset's sheet panel (fortune/resistance only) has no action roll to penalize.
  test('moderate harm surfaces the −1d penalty on the action panel; clearing removes it', async ({
    gmPage,
  }) => {
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets|Refresh my Brackwater copy/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' }).last()).toBeVisible({
      timeout: 30_000,
    });
    const ruleset = { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
    await createCampaign(gmPage, ruleset, uniqueName('Penalty Test'));

    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/new$/);
    await gmPage.getByLabel('Character name').fill(uniqueName('Limper'));
    await gmPage.getByRole('button', { name: 'The Knife' }).click();
    for (let i = 0; i < 7; i++)
      await gmPage.getByRole('button', { name: 'Next', exact: true }).click();
    await gmPage.getByRole('button', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+$/, { timeout: 15_000 });
    await gmPage.getByRole('link', { name: 'View' }).first().click();
    await gmPage.waitForURL(/\/characters\/[0-9a-f-]+$/);

    // Take moderate harm on the sheet face; the ACTION panel surfaces the −1d with a waiver.
    await gmPage.getByLabel('Take harm').fill('Cracked ribs');
    await gmPage.getByRole('button', { name: '+ Moderate' }).click();
    await expect(gmPage.getByText('Moderate harm — this roll loses 1 die.')).toBeVisible({
      timeout: 15_000,
    });
    await expect(gmPage.getByRole('checkbox', { name: /waive harm penalty/i })).toBeVisible();

    // Recovery clears the wound and the penalty hint with it.
    await gmPage.getByRole('button', { name: 'Clear harm: Cracked ribs' }).click();
    await expect(gmPage.getByText('Cleared harm: Cracked ribs')).toBeVisible({ timeout: 10_000 });
    await expect(gmPage.getByText('Moderate harm — this roll loses 1 die.')).toHaveCount(0, {
      timeout: 10_000,
    });
  });
});
