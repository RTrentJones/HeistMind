// Phase 1 — per-action ratings. The Brackwater starter ruleset is in action-rating mode, so the
// "Assign Action Ratings" step rates the 12 actions (0–2 at creation) and the attribute rating is
// DERIVED. This drives that step end-to-end via the bundled-ruleset "load starter" flow. (The
// cinders/veil journeys stay on attribute point-buy — action mode is opt-in, so they're untouched.)

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 120_000 });

test.describe('GM: action ratings (Brackwater)', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('rates actions, derives attributes, and creates a character', async ({ gmPage }) => {
    // Load the bundled Brackwater starter (action-rating mode) and spin up a campaign.
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets|Refresh my Brackwater copy/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' }).last()).toBeVisible({
      timeout: 30_000,
    });
    const ruleset = { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
    await createCampaign(gmPage, ruleset, uniqueName('The Brackwater Job'));

    // Into the wizard.
    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/new$/);
    await gmPage.getByLabel('Character name').fill('Vell Quitch');
    await gmPage.getByRole('button', { name: 'The Knife' }).click();

    // → Assign Action Ratings (NOT attribute point-buy).
    await gmPage.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(gmPage.getByRole('heading', { name: 'Assign Action Ratings' })).toBeVisible();
    // Budget = playbook's 3 seeded dots (Clash 2 + Marshal 1) + 4 creation points = 7 (BitD-canon).
    await expect(gmPage.getByText(/\/ 7 action dots/)).toBeVisible();
    // Cunning has no seeded actions (the knife seeds Clash + Marshal), so it derives 0 to start.
    // (F53: the badge shows just the number now — the header names the attribute.)
    await expect(gmPage.getByTestId('derived-cunning')).toHaveText('0');

    // Assign two Cunning actions (the first dot of the first two actions, Track + Examine) →
    // derived Cunning becomes 2, and the spend rises to 5 (3 seeded + 2 assigned).
    const dots = gmPage.locator('button.rounded-full');
    await dots.nth(0).click();
    await dots.nth(2).click();
    await expect(gmPage.getByTestId('derived-cunning')).toHaveText('2');
    await expect(gmPage.getByText(/5 \/ 7 action dots/)).toBeVisible();

    // Abilities → identity steps → review → create (under-spent dots are a warning, not a block).
    // BitD = exactly ONE ability at creation; the playbook seeds Scarred, clicking Bulwark SWAPS to it.
    const next = gmPage.getByRole('button', { name: 'Next', exact: true });
    await next.click();
    await expect(gmPage.getByText(/of 1 chosen/i)).toBeVisible();
    await gmPage.getByRole('button', { name: /Bulwark/ }).click();
    await next.click(); // Heritage
    await next.click(); // Background
    await next.click(); // Vice
    await next.click(); // Crew Ties
    await next.click(); // Confirm Crew Member (review)
    await expect(gmPage.getByRole('heading', { name: /Confirm Crew Member/i })).toBeVisible();
    await gmPage.getByRole('button', { name: 'Create character' }).click();

    await expect(gmPage).toHaveURL(/\/games\/[0-9a-f-]+$/, { timeout: 15_000 });
    await expect(gmPage).not.toHaveURL(/characters\/new/);
    // The character card heading (the "add result" form also lists the name as a select option).
    await expect(gmPage.getByRole('heading', { name: 'Vell Quitch' })).toBeVisible({
      timeout: 15_000,
    });
  });
});
