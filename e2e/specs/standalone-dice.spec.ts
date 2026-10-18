// F95 — a standalone character (no campaign) rolls from its own sheet ("sheet anywhere"). Rolls
// are display-only: nothing lands in any log, but the stress the rules charge (a resistance's
// 6 − highest) is marked on the sheet and survives a reload. Dice are pinned (Math.random → a 4)
// so the stress cost is deterministic.

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { uniqueName } from '../support/rulesets';
import { buildStandaloneBrackwater } from '../support/characters';

test.describe.configure({ timeout: 180_000 });

test.describe('standalone sheet dice (display-only)', () => {
  test.beforeEach(() => {
    test.skip(!isLocalStack(), 'Requires the local Supabase stack.');
  });

  test('rolls fortune + resistance on a standalone sheet; only the stress cost persists', async ({
    gmPage,
  }) => {
    await gmPage.addInitScript(() => {
      Math.random = () => 0.55; // every die a 4
    });
    const name = uniqueName('Solo Roller');
    await buildStandaloneBrackwater(gmPage, name);
    await gmPage.waitForURL(/\/characters\/[0-9a-f]{8}-[0-9a-f-]+$/, { timeout: 15_000 });
    const sheetUrl = gmPage.url();

    await expect(gmPage.getByRole('heading', { name: 'Dice' })).toBeVisible();
    await expect(gmPage.getByTestId('roll-local-note')).toContainText(/aren't saved anywhere/i);

    // Fortune: classified on the spot, nothing charged.
    await gmPage.getByLabel('Roll type').selectOption('fortune');
    await gmPage.getByRole('button', { name: 'Roll', exact: true }).click();
    await expect(gmPage.getByTestId('roll-result')).toContainText('Partial');
    await expect(
      gmPage
        .locator('#sheet-condition')
        .getByText(/^0\/\d+$/)
        .first()
    ).toBeVisible();

    // Resistance: 6 − 4 = 2 stress, marked on the sheet.
    await gmPage.getByLabel('Roll type').selectOption('resistance');
    await gmPage.getByRole('button', { name: 'Resist', exact: true }).click();
    await expect(gmPage.getByTestId('roll-result')).toContainText('2 stress');
    await expect(
      gmPage
        .locator('#sheet-condition')
        .getByText(/^2\/\d+$/)
        .first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(gmPage.getByTestId('roll-history').locator('li')).toHaveCount(2);

    // After a reload: the stress stays (sheet state), the rolls don't (no log anywhere).
    await gmPage.goto(sheetUrl);
    await expect(
      gmPage
        .locator('#sheet-condition')
        .getByText(/^2\/\d+$/)
        .first()
    ).toBeVisible({ timeout: 15_000 });
    await expect(gmPage.getByTestId('roll-result')).toBeEmpty();
    await expect(gmPage.getByTestId('roll-history')).toHaveCount(0);
  });
});
