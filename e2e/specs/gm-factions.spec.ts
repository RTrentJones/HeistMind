// Phase 9 — factions + status (campaign). The GM seeds a city power, shifts its status toward the
// crew, and attaches a project clock (a clock linked to the faction). All DB-backed shared state
// that persists. Uses the Brackwater starter (it suggests factions).

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 120_000 });

test.describe('GM: factions + status', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('GM seeds a faction, shifts status, and attaches a project clock; persists', async ({
    gmPage,
  }) => {
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' }).last()).toBeVisible({
      timeout: 30_000,
    });
    const ruleset = { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
    const gameUrl = await createCampaign(gmPage, ruleset, uniqueName('The Faction Job'));

    // Seed a suggested faction.
    await expect(gmPage.getByRole('heading', { name: 'Factions', exact: true })).toBeVisible();
    await gmPage.getByLabel('Add faction').selectOption('The Tidewatch');
    await gmPage.getByRole('button', { name: 'Add faction', exact: true }).click();
    await expect(gmPage.getByText('The Tidewatch', { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(gmPage.getByText('Neutral')).toBeVisible();

    // Shift status one step toward allied → Friendly. The badge is the status of record; the
    // shift ALSO lands in the campaign feed (round-3 PR-3), so bare getByText('Friendly') would
    // be ambiguous with the feed note.
    const statusBadge = gmPage.locator('[data-testid^="faction-status-"]');
    await gmPage.getByRole('button', { name: 'Raise The Tidewatch status' }).click();
    await expect(statusBadge).toHaveText('+1', { timeout: 10_000 });
    await expect(gmPage.getByText('Status shifted to +1 (Friendly)')).toBeVisible({
      timeout: 10_000,
    });

    // Attach a faction project clock and tick it.
    await gmPage.getByLabel('Project clock for The Tidewatch').fill('Hunt the crew');
    await gmPage.getByRole('button', { name: 'Add clock for The Tidewatch' }).click();
    await expect(gmPage.getByText('Hunt the crew 0/4')).toBeVisible({ timeout: 10_000 });
    await gmPage.getByRole('button', { name: 'Advance Hunt the crew' }).click();
    await expect(gmPage.getByText('Hunt the crew 1/4')).toBeVisible({ timeout: 10_000 });

    // All of it persists (DB-backed shared state) — status badge AND the feed event.
    await gmPage.goto(gameUrl);
    await expect(gmPage.locator('[data-testid^="faction-status-"]')).toHaveText('+1', {
      timeout: 15_000,
    });
    await expect(gmPage.getByText('Hunt the crew 1/4')).toBeVisible();
    await expect(gmPage.getByText('Status shifted to +1 (Friendly)')).toBeVisible();
  });
});
