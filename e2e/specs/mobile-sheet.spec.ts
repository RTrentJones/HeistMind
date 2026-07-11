// F57 — the phone-first sheet, walked through at a real phone viewport (390×844): the in-play
// sections (Condition, Dice) render ABOVE the build detail, and the fixed thumb bar jumps to
// them from anywhere on the page. Desktop keeps the original order (asserted by contrast).

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName, uploadRuleset } from '../support/rulesets';

test.describe.configure({ timeout: 120_000 });

test.describe('Mobile: phone-first character sheet', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('in-play sections lead on a phone and the thumb bar jumps to them', async ({ gmPage }) => {
    const ruleset = await uploadRuleset(gmPage, 'cinders.json', uniqueName('Cinders & Coin'));
    await createCampaign(gmPage, ruleset, uniqueName('Mobile Test'));
    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/new$/);
    await gmPage.getByLabel('Character name').fill(uniqueName('Thumb'));
    await gmPage.getByRole('button', { name: 'The Razor' }).click();
    for (let i = 0; i < 5; i++)
      await gmPage.getByRole('button', { name: 'Next', exact: true }).click();
    await gmPage.getByRole('button', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+$/);
    await gmPage.getByRole('link', { name: 'View' }).first().click();
    await gmPage.waitForURL(/\/characters\/[0-9a-f-]+$/);

    // --- Desktop first: DOM order — abilities before Condition; no thumb bar. ---
    await expect(gmPage.getByRole('navigation', { name: 'Sheet sections' })).toBeHidden();

    // --- Phone viewport: the flex order flips the in-play sections up and the bar appears. ---
    await gmPage.setViewportSize({ width: 390, height: 844 });
    const bar = gmPage.getByRole('navigation', { name: 'Sheet sections' });
    await expect(bar).toBeVisible();

    const conditionY = (await gmPage.locator('#sheet-condition').boundingBox())?.y ?? Infinity;
    const abilitiesY =
      (await gmPage.getByRole('heading', { name: 'Special Abilities' }).boundingBox())?.y ??
      -Infinity;
    expect(conditionY, 'Condition must render above build detail on a phone').toBeLessThan(
      abilitiesY
    );

    // The thumb bar's Dice jump brings the roll panel into view from the top of the page.
    await bar.getByRole('button', { name: 'Dice', exact: true }).click();
    await expect(gmPage.locator('#sheet-dice')).toBeInViewport({ timeout: 10_000 });

    // …and Condition jumps back up.
    await bar.getByRole('button', { name: 'Condition', exact: true }).click();
    await expect(gmPage.locator('#sheet-condition')).toBeInViewport({ timeout: 10_000 });
  });
});
