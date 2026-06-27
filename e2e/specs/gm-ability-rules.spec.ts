// Phase 6 — ability rules text. Brackwater's special abilities ship full, resolvable rules (not
// just a flavor one-liner). The creation wizard shows the rules inline on each ability card, and
// the character sheet shows them in an expandable detail per owned ability. This drives both.

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 180_000 });

test.describe('GM: ability rules text (Brackwater)', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('shows rules inline in the wizard and expandable on the sheet', async ({ gmPage }) => {
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' }).last()).toBeVisible({
      timeout: 30_000,
    });
    const ruleset = { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
    await createCampaign(gmPage, ruleset, uniqueName('The Rules Job'));

    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/new$/);
    await gmPage.getByLabel('Character name').fill(uniqueName('Scholar'));
    await gmPage.getByRole('button', { name: 'The Knife' }).click();
    const next = gmPage.getByRole('button', { name: 'Next', exact: true });
    await next.click(); // → action ratings
    await next.click(); // → special abilities

    // The wizard shows the full rules text inline on each ability card (Bulwark's exact effect).
    await expect(gmPage.getByText(/take the harm onto yourself/)).toBeVisible();

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

    // On the sheet, each owned ability is an expandable detail. Scarred's rules are hidden until
    // its summary is opened.
    await expect(gmPage.getByText('Scarred', { exact: true })).toBeVisible();
    await expect(gmPage.getByText(/take 1 less stress to do so/)).toBeHidden();
    await gmPage.getByText('Scarred', { exact: true }).click();
    await expect(gmPage.getByText(/take 1 less stress to do so/)).toBeVisible({ timeout: 10_000 });
  });
});
