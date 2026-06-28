// Phase 3 — character lifecycle & roster. The campaign roster attributes each character to a player
// and shows status; a character can be RETIRED (status → retired, carried coin banked to stash, kept
// for history). This drives create → retire → it drops to the retired section, and persists.

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 180_000 });

test.describe('GM: roster & retire (Brackwater)', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('retires a character — it moves to the retired section and persists', async ({ gmPage }) => {
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' }).last()).toBeVisible({
      timeout: 30_000,
    });
    const ruleset = { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
    await createCampaign(gmPage, ruleset, uniqueName('The Retirement Job'));

    // Create a character (one ability is seeded; step through).
    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/new$/);
    await gmPage.getByLabel('Character name').fill('Retiree');
    await gmPage.getByRole('button', { name: 'The Knife' }).click();
    const next = gmPage.getByRole('button', { name: 'Next', exact: true });
    for (let i = 0; i < 7; i++) await next.click();
    await gmPage.getByRole('button', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+$/, { timeout: 15_000 });

    // The roster lists the character (active → it has a Retire action). Retire it (two-click confirm).
    await expect(gmPage.getByRole('heading', { name: 'Retiree' })).toBeVisible();
    await gmPage.getByRole('button', { name: 'Retire', exact: true }).click();
    await gmPage.getByRole('button', { name: 'Confirm retire' }).click();

    // It drops to the retired section and no active Retire action remains.
    await expect(gmPage.getByText('Retired & fallen')).toBeVisible({ timeout: 10_000 });
    await expect(gmPage.getByRole('button', { name: 'Retire', exact: true })).toHaveCount(0);

    // Persists across a reload (the character stays in history, retired).
    await gmPage.reload();
    await expect(gmPage.getByText('Retired & fallen')).toBeVisible({ timeout: 15_000 });
    await expect(gmPage.getByRole('heading', { name: 'Retiree' })).toBeVisible();
  });
});
