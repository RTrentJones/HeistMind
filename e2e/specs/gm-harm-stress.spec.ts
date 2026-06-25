// Phase 2 — harm + a live, always-on stress tracker. Stress is editable straight on the character
// sheet (no "Edit build"), and harm is added in the editor; both persist. Uses the cinders fixture
// (a quick character build) since the Condition card + harm are ruleset-agnostic.

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName, uploadRuleset } from '../support/rulesets';

test.describe.configure({ timeout: 120_000 });

test.describe('GM: harm + live stress', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('edits stress on the sheet and harm in the editor, both persisting', async ({ gmPage }) => {
    const ruleset = await uploadRuleset(gmPage, 'cinders.json', uniqueName('Cinders & Coin'));
    await createCampaign(gmPage, ruleset, uniqueName('Harm Test'));

    // Minimal character.
    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/new$/);
    const charName = uniqueName('Bruise');
    await gmPage.getByLabel('Character name').fill(charName);
    await gmPage.getByRole('button', { name: 'The Razor' }).click();
    for (let i = 0; i < 5; i++)
      await gmPage.getByRole('button', { name: 'Next', exact: true }).click();
    await gmPage.getByRole('button', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+$/);
    await gmPage.getByRole('link', { name: 'View' }).first().click();
    await gmPage.waitForURL(/\/characters\/[0-9a-f-]+$/);

    // --- Live stress: the Condition card's tracker saves on click; persists across reload. ---
    await expect(gmPage.getByRole('heading', { name: 'Condition' })).toBeVisible();
    await expect(gmPage.getByText('0/9')).toBeVisible();
    await gmPage.locator('button.rounded-full').nth(2).click(); // set stress = 3
    await expect(gmPage.getByText('3/9')).toBeVisible({ timeout: 10_000 });
    await gmPage.reload();
    await expect(gmPage.getByText('3/9')).toBeVisible({ timeout: 15_000 }); // persisted

    // --- Harm: added in the editor's Stress tab; appears on the sheet's harm track. ---
    await gmPage.getByRole('button', { name: 'Edit build' }).click();
    await gmPage.getByRole('button', { name: 'Stress & Trauma' }).click();
    await gmPage.getByLabel('Add harm').fill('Battered');
    await gmPage.getByRole('button', { name: '+ Lesser' }).click();
    await gmPage.getByRole('button', { name: /Save stress, harm/ }).click();
    await expect(gmPage.getByText('Battered').first()).toBeVisible({ timeout: 10_000 });
    await gmPage.reload();
    await expect(gmPage.getByText('Battered').first()).toBeVisible({ timeout: 15_000 }); // persisted
  });
});
