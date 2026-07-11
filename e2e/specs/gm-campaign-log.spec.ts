// Phase 2 — the campaign log. A game runs as scores; settled results (rolled in-app, or on Discord /
// in person) are recorded to the shared feed, which GROUPS events under their score. This drives the
// score lifecycle + the "add result" entry + the score-grouped feed end to end. Uses Brackwater.

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 120_000 });

test.describe('GM: campaign log (Brackwater)', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('starts a score and records a result that groups under it in the feed', async ({
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
    await createCampaign(gmPage, ruleset, uniqueName('The Log Job'));

    // Start a score (the per-operation unit the feed groups by).
    await expect(gmPage.getByRole('heading', { name: 'Score', exact: true })).toBeVisible();
    await gmPage.getByLabel('Score name').fill('The Test Job');
    await gmPage.getByRole('button', { name: 'Start score' }).click();
    await expect(gmPage.getByText('In progress')).toBeVisible({ timeout: 10_000 });

    // Record a result settled elsewhere (a 'note' event, auto-tagged with the active score).
    await gmPage.getByLabel('What happened').fill('Tense skirmish — partial; took 2 stress');
    await gmPage.getByRole('button', { name: 'Add to log' }).click();

    // The feed shows the result, grouped under the score (its name renders as the group header).
    await expect(gmPage.getByText('Tense skirmish — partial; took 2 stress')).toBeVisible({
      timeout: 10_000,
    });
    // "The Test Job" now appears both in the score panel and as the feed's group header.
    await expect(gmPage.getByText('The Test Job').first()).toBeVisible();

    // It persists across a reload (DB-backed campaign record).
    await gmPage.reload();
    await expect(gmPage.getByText('Tense skirmish — partial; took 2 stress')).toBeVisible({
      timeout: 15_000,
    });
  });
});
