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
      .getByRole('button', { name: /Load the Brackwater starter ruleset/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' })).toBeVisible({
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
    // Budget = playbook's 1 seeded dot + 4 creation points = 5.
    await expect(gmPage.getByText(/\/ 5 action dots/)).toBeVisible();
    // Derived attributes start from the seeded Clash (Force) dot.
    await expect(gmPage.getByText('Cunning 0')).toBeVisible();

    // Assign two Cunning actions (the first dot of the first two actions, Track + Examine) →
    // derived Cunning becomes 2, and the budget spend rises to 3.
    const dots = gmPage.locator('button.rounded-full');
    await dots.nth(0).click();
    await dots.nth(2).click();
    await expect(gmPage.getByText('Cunning 2')).toBeVisible();
    await expect(gmPage.getByText(/3 \/ 5 action dots/)).toBeVisible();

    // Abilities → identity steps → review → create (under-spent dots are a warning, not a block).
    const next = gmPage.getByRole('button', { name: 'Next', exact: true });
    await next.click();
    await expect(gmPage.getByText(/of 2 chosen/i)).toBeVisible();
    await gmPage.getByText('Bulwark', { exact: true }).click();
    await next.click(); // Heritage
    await next.click(); // Background
    await next.click(); // Vice
    await next.click(); // Crew Ties
    await next.click(); // Confirm Crew Member (review)
    await expect(gmPage.getByRole('heading', { name: /Confirm Crew Member/i })).toBeVisible();
    await gmPage.getByRole('button', { name: 'Create character' }).click();

    await expect(gmPage).toHaveURL(/\/games\/[0-9a-f-]+$/, { timeout: 15_000 });
    await expect(gmPage).not.toHaveURL(/characters\/new/);
    await expect(gmPage.getByText('Vell Quitch')).toBeVisible({ timeout: 15_000 });
  });
});
