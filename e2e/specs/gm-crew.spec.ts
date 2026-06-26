// Phase 8 — the crew sheet (campaign). The GM starts the crew (picks a type), tracks heat, takes a
// crew ability, and stakes a claim — all DB-backed shared state that persists across reload. Uses
// the Brackwater starter (it ships crew types / abilities / claims).

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 120_000 });

test.describe('GM: crew sheet', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('GM creates the crew, tracks heat, takes an ability and a claim; persists', async ({
    gmPage,
  }) => {
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' })).toBeVisible({
      timeout: 30_000,
    });
    const ruleset = { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
    const gameUrl = await createCampaign(gmPage, ruleset, uniqueName('The Crew Job'));

    // The campaign page has a Crew section; as the GM, start the sheet by picking a type.
    await expect(gmPage.getByRole('heading', { name: 'Crew', exact: true })).toBeVisible();
    await gmPage.getByLabel('Crew type').selectOption('shadows');
    await gmPage.getByRole('button', { name: 'Create crew' }).click();

    // The sheet renders with FitD stats; Heat starts at 0.
    await expect(gmPage.getByTestId('crew-heat')).toHaveText('0', { timeout: 10_000 });
    await gmPage.getByRole('button', { name: 'Increase Heat' }).click();
    await expect(gmPage.getByTestId('crew-heat')).toHaveText('1');

    // Take a crew ability (the checkbox is controlled by an async save → click, then await the
    // persisted checked state) and stake a claim.
    await gmPage.getByRole('checkbox', { name: /Deadly/ }).click();
    await expect(gmPage.getByRole('checkbox', { name: /Deadly/ })).toBeChecked({ timeout: 10_000 });
    await gmPage.getByLabel('Add claim').selectOption('Lair');
    await gmPage.getByRole('button', { name: 'Add claim' }).click();
    // The claim renders as a removable badge (unambiguous vs. the stale <option> of the same text).
    await expect(gmPage.getByRole('button', { name: 'Remove claim Lair' })).toBeVisible({
      timeout: 10_000,
    });

    // All of it persists (DB-backed shared state).
    await gmPage.goto(gameUrl);
    await expect(gmPage.getByTestId('crew-heat')).toHaveText('1', { timeout: 15_000 });
    await expect(gmPage.getByRole('checkbox', { name: /Deadly/ })).toBeChecked();
    await expect(gmPage.getByRole('button', { name: 'Remove claim Lair' })).toBeVisible();
  });
});
