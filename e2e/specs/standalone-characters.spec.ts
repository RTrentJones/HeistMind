// Phase 5 — portable characters (F56). A character can be built WITHOUT a campaign ("My Characters"),
// opened as a standalone sheet, and later attached (linked) into a campaign that uses the same
// ruleset. Single active campaign: attaching just sets the character's game.

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 180_000 });

// Add the bundled Brackwater starter (action-ratings mode) and return the ruleset identifiers used
// to create a campaign + recognise it in the standalone ruleset picker.
async function addBrackwater(page: import('@playwright/test').Page) {
  await page.goto('/rulesets');
  await page
    .getByRole('button', { name: /Add Brackwater to my rulesets/i })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Brackwater' }).last()).toBeVisible({
    timeout: 30_000,
  });
  return { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
}

// Build a character through the wizard currently mounted on the page (Brackwater: name → playbook →
// step to the end → Create). Works for both the standalone and in-campaign mounts.
async function buildBrackwaterCharacter(page: import('@playwright/test').Page, name: string) {
  await page.getByLabel('Character name').fill(name);
  await page.getByRole('button', { name: 'The Knife' }).click();
  const next = page.getByRole('button', { name: 'Next', exact: true });
  for (let i = 0; i < 7; i++) await next.click();
  await page.getByRole('button', { name: 'Create character' }).click();
}

test.describe('Phase 5: portable characters', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + 00014 not on this deploy).'
    );
  });

  test('builds a standalone character and lists it in My Characters', async ({ gmPage }) => {
    await addBrackwater(gmPage);

    // Create with NO campaign: My Characters → New character → pick the ruleset → wizard.
    await gmPage.goto('/characters/new');
    await expect(gmPage.getByRole('heading', { name: 'New character' })).toBeVisible();
    const brackwaterCard = gmPage
      .locator('div')
      .filter({ hasText: 'Brackwater' })
      .filter({ has: gmPage.getByRole('button', { name: 'Build' }) })
      .last();
    await brackwaterCard.getByRole('button', { name: 'Build' }).click();

    const charName = uniqueName('Solo Scoundrel');
    await buildBrackwaterCharacter(gmPage, charName);

    // Lands on the standalone sheet (/characters/<uuid>, not a game route).
    await gmPage.waitForURL(/\/characters\/[0-9a-f]{8}-[0-9a-f-]+$/, { timeout: 15_000 });
    await expect(gmPage.getByRole('heading', { name: charName })).toBeVisible();
    // The standalone sheet offers to bring it to a campaign, and has no shared dice/log section.
    await expect(gmPage.getByRole('heading', { name: 'Bring to a campaign' })).toBeVisible();

    // It shows up in My Characters, flagged standalone.
    await gmPage.goto('/characters');
    await expect(gmPage.getByRole('heading', { name: 'My characters' })).toBeVisible();
    const row = gmPage
      .locator('div')
      .filter({ has: gmPage.getByRole('heading', { name: charName }) })
      .last();
    await expect(row.getByText('Standalone').first()).toBeVisible();
  });

  test('attaches a standalone character into a same-ruleset campaign', async ({ gmPage }) => {
    const ruleset = await addBrackwater(gmPage);
    const campaign = uniqueName('The Linked Job');
    await createCampaign(gmPage, ruleset, campaign);

    // Build a standalone character against the same ruleset.
    await gmPage.goto('/characters/new');
    const brackwaterCard = gmPage
      .locator('div')
      .filter({ hasText: 'Brackwater' })
      .filter({ has: gmPage.getByRole('button', { name: 'Build' }) })
      .last();
    await brackwaterCard.getByRole('button', { name: 'Build' }).click();
    const charName = uniqueName('Recruit');
    await buildBrackwaterCharacter(gmPage, charName);
    await gmPage.waitForURL(/\/characters\/[0-9a-f]{8}-[0-9a-f-]+$/, { timeout: 15_000 });

    // Attach it to the campaign (same ruleset → it's an option). It moves to the in-campaign view.
    await gmPage.getByLabel('Campaign').selectOption({ label: campaign });
    await gmPage.getByRole('button', { name: 'Attach' }).click();
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+\/characters\/[0-9a-f-]+$/, { timeout: 15_000 });

    // It now appears in that campaign's roster.
    await gmPage.getByRole('link', { name: /back to campaign/i }).click();
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+$/);
    await expect(gmPage.getByRole('heading', { name: charName })).toBeVisible();
  });
});
