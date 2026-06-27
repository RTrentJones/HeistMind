// Phase A2/A3 — the stress half of the FitD loop: a resistance roll costs stress and lands in the
// shared roll log, and indulge-vice downtime clears it. Mirrors the manual play-by-post flow.
// Uses the cinders fixture (action ratings → the RollPanel's resistance mode) and the live
// Condition-card stress tracker, exactly like gm-harm-stress.

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName, uploadRuleset } from '../support/rulesets';

test.describe.configure({ timeout: 120_000 });

test.describe('GM: resistance + downtime', () => {
  // Mutates the per-env schema — local Supabase stack only (matches the journey specs).
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('indulge vice clears stress; a resistance roll lands in the feed', async ({ gmPage }) => {
    const ruleset = await uploadRuleset(gmPage, 'cinders.json', uniqueName('Cinders & Coin'));
    await createCampaign(gmPage, ruleset, uniqueName('Resist Test'));

    // Minimal character (cinders/The Razor — 6 steps, 5 Nexts).
    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/new$/);
    await gmPage.getByLabel('Character name').fill(uniqueName('Resolve'));
    await gmPage.getByRole('button', { name: 'The Razor' }).click();
    for (let i = 0; i < 5; i++)
      await gmPage.getByRole('button', { name: 'Next', exact: true }).click();
    await gmPage.getByRole('button', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+$/);
    await gmPage.getByRole('link', { name: 'View' }).first().click();
    await gmPage.waitForURL(/\/characters\/[0-9a-f-]+$/);

    // --- Downtime: indulge vice clears stress to 0. The button is disabled at 0 stress, so raise
    // it to 3 on the live Condition tracker first, then indulge. ---
    await expect(gmPage.getByRole('heading', { name: 'Condition' })).toBeVisible();
    await expect(gmPage.getByText('0/9')).toBeVisible();
    await gmPage.locator('button.rounded-full').nth(2).click(); // set stress = 3
    await expect(gmPage.getByText('3/9')).toBeVisible({ timeout: 10_000 });
    await gmPage.getByRole('button', { name: 'Indulge vice (clear stress)' }).click();
    // BitD vice roll clears a *rolled* amount (the lowest-attribute roll's highest die), so assert
    // the downtime entry lands in the feed rather than a fixed 0/9.
    await expect(gmPage.getByText(/Indulged vice — cleared/).first()).toBeVisible({
      timeout: 15_000,
    });

    // --- Resistance: roll against an attribute → an entry lands in the shared roll log, annotated
    // with the stress it cost. The die is random (stress can be 0–6), so assert the log entry's
    // "resisted" annotation rather than a specific value. ---
    await gmPage.getByLabel('Roll type').selectOption('resistance');
    await gmPage.getByRole('button', { name: 'Resist', exact: true }).click();
    await expect(gmPage.getByText(/resisted/).first()).toBeVisible({ timeout: 15_000 });
  });
});
