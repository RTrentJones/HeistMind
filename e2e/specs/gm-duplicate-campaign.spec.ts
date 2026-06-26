// Regression — a campaign name is unique per creator. A second campaign with the same name must
// surface a clear prompt ("You already have a campaign named …"), not the raw Postgres constraint.

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 120_000 });

test.describe('GM: duplicate campaign name', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('a duplicate name shows a clear message, not the raw constraint error', async ({
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
    const name = uniqueName('Dup Campaign');
    await createCampaign(gmPage, ruleset, name);

    // Try to create another campaign with the same name.
    await gmPage.goto('/games/new');
    await gmPage
      .getByLabel('Ruleset', { exact: true })
      .selectOption({ label: ruleset.optionLabel });
    await gmPage.getByLabel('Campaign name').fill(name);
    await gmPage.getByRole('button', { name: 'Create campaign' }).click();

    await expect(gmPage.getByText(/You already have a campaign named/)).toBeVisible({
      timeout: 10_000,
    });
    // …and we did not navigate away.
    await expect(gmPage).toHaveURL(/\/games\/new$/);
  });
});
