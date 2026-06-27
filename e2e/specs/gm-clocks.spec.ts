// Phase 7 — progress clocks (campaign). The GM creates a clock on the campaign page, ticks it, and
// it persists as DB-backed shared state (every player sees it on load — the async loop). RLS limits
// writes to the GM; this drives the GM's create → tick → persist loop.

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 120_000 });

test.describe('GM: progress clocks', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('GM creates and ticks a clock; it persists', async ({ gmPage }) => {
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' }).last()).toBeVisible({
      timeout: 30_000,
    });
    const ruleset = { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
    const gameUrl = await createCampaign(gmPage, ruleset, uniqueName('The Clock Job'));

    // The campaign page has a Clocks section; as the GM, the create form is shown.
    await expect(gmPage.getByRole('heading', { name: 'Clocks', exact: true })).toBeVisible();
    await gmPage.getByLabel('New clock').fill('The Alarm');
    // Segments defaults to 4.
    await gmPage.getByRole('button', { name: 'Add clock' }).click();

    // The clock renders (empty) and is GM-tickable.
    await expect(gmPage.getByText('The Alarm 0/4')).toBeVisible({ timeout: 10_000 });
    await gmPage.getByRole('button', { name: 'Advance The Alarm' }).click();
    await gmPage.getByRole('button', { name: 'Advance The Alarm' }).click();
    await expect(gmPage.getByText('The Alarm 2/4')).toBeVisible({ timeout: 10_000 });

    // Persists across a reload (DB-backed shared state).
    await gmPage.goto(gameUrl);
    await expect(gmPage.getByText('The Alarm 2/4')).toBeVisible({ timeout: 15_000 });

    // Ticking down works too.
    await gmPage.getByRole('button', { name: 'Reduce The Alarm' }).click();
    await expect(gmPage.getByText('The Alarm 1/4')).toBeVisible({ timeout: 10_000 });
  });
});
