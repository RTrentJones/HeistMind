// Phase 5 — advancement as XP tracks + triggers. Brackwater advances via BitD XP tracks (playbook
// 8 / attribute 6) rather than a flat pool: mark XP on the sheet, and a FULL track unlocks an
// advance (playbook → a special ability; attribute → an action dot) which clears the track. This
// drives that loop end-to-end and asserts the gating (an advance is blocked until its track fills).

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 180_000 });

test.describe('GM: XP tracks + advancement (Brackwater)', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('marks XP to fill a track, which gates then unlocks an advance', async ({ gmPage }) => {
    // Brackwater starter + campaign + a minimal Knife.
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', { name: /Load the Brackwater starter ruleset/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' })).toBeVisible({
      timeout: 30_000,
    });
    const ruleset = { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
    await createCampaign(gmPage, ruleset, uniqueName('The Advancement Job'));

    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/new$/);
    await gmPage.getByLabel('Character name').fill(uniqueName('Climber'));
    await gmPage.getByRole('button', { name: 'The Knife' }).click();
    const next = gmPage.getByRole('button', { name: 'Next', exact: true });
    await next.click(); // → action ratings
    await next.click(); // → special abilities
    await gmPage.getByText('Bulwark', { exact: true }).click();
    await next.click(); // → Heritage
    await next.click(); // → Background
    await next.click(); // → Vice
    await next.click(); // → Crew Ties
    await next.click(); // → review
    await gmPage.getByRole('button', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+$/, { timeout: 15_000 });
    await gmPage.getByRole('link', { name: 'View' }).first().click();
    await gmPage.waitForURL(/\/characters\/[0-9a-f-]+$/);

    // The sheet shows the XP-track "Experience" card and NOT the flat-pool "Add XP" affordance.
    await expect(gmPage.getByRole('heading', { name: 'Experience' })).toBeVisible();
    await expect(gmPage.getByRole('button', { name: 'Add XP' })).toHaveCount(0);

    // --- Gating: an ability can't be taken until the playbook track is full. ---
    await gmPage.getByRole('button', { name: 'Edit build' }).click();
    await gmPage.getByRole('button', { name: 'Advancement' }).click();
    await expect(gmPage.getByText('Fill the playbook XP track').first()).toBeVisible();
    await expect(
      gmPage.getByText('Fill an attribute XP track to add an action dot.')
    ).toBeVisible();

    // --- Mark the playbook track to full on the sheet (click its 8th box). ---
    await gmPage.getByTestId('xp-track-playbook').locator('button.rounded-full').nth(7).click();
    await expect(gmPage.getByText('Full — ready to advance').first()).toBeVisible({
      timeout: 10_000,
    });

    // The gate lifts: take the first buyable ability (Duelist) — it clears the playbook track.
    await expect(gmPage.getByText('Fill the playbook XP track')).toHaveCount(0);
    await gmPage.getByRole('button', { name: 'Take ability' }).first().click();
    // The sheet's ability list shows the ability's name (Duelist), not its id.
    await expect(gmPage.getByText('Duelist', { exact: true })).toBeVisible({ timeout: 10_000 });
    // Track cleared after spending it.
    await expect(gmPage.getByText('Full — ready to advance')).toHaveCount(0);
    await expect(gmPage.getByText('Playbook 0/8')).toBeVisible();

    // --- Attribute track: filling Force unlocks its action-dot picker. ---
    await gmPage.getByTestId('xp-track-force').locator('button.rounded-full').nth(5).click();
    await expect(gmPage.getByText(/Force — pick an action to raise/)).toBeVisible({
      timeout: 10_000,
    });
  });
});
