// Regression — reloading the bundled starter REFRESHES an existing copy's content (rather than a
// dead-end "you already have it"). A starter loaded before a content update (crew, factions,
// ability rules…) would otherwise stay frozen and those pickers would be empty.

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';

test.describe.configure({ timeout: 120_000 });

test.describe('GM: refresh the starter ruleset', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('reloading the starter refreshes its content instead of erroring', async ({ gmPage }) => {
    await gmPage.goto('/rulesets');

    // First load creates the copy.
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' })).toBeVisible({
      timeout: 30_000,
    });

    // Reloading refreshes the existing copy to the latest content (no duplicate-name dead end).
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets/i })
      .first()
      .click();
    await expect(gmPage.getByText(/Refreshed your .* to the latest content/)).toBeVisible({
      timeout: 10_000,
    });
  });
});
