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

// Build a STANDALONE Brackwater character (My Characters → New character → pick Brackwater → wizard).
// Lands on the standalone sheet.
async function buildStandaloneBrackwater(page: import('@playwright/test').Page, name: string) {
  await page.goto('/characters/new');
  await page
    .locator('div')
    .filter({ hasText: 'Brackwater' })
    .filter({ has: page.getByRole('button', { name: 'Build' }) })
    .last()
    .getByRole('button', { name: 'Build' })
    .click();
  await buildBrackwaterCharacter(page, name);
  await page.waitForURL(/\/characters\/[0-9a-f]{8}-[0-9a-f-]+$/, { timeout: 15_000 });
}

test.describe('Phase 5: portable characters', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + 00014 not on this deploy).'
    );
  });

  test('inline starter catalog: builds a character with NO /rulesets detour (F37)', async ({
    gmPage,
  }) => {
    // Straight to character creation — the built-in catalog is inline there, and loading one
    // continues DIRECTLY into the wizard. Works for both the zero-ruleset empty state and the
    // "add another system" section, so no empty-account precondition is needed.
    await gmPage.goto('/characters/new');
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets/i })
      .first()
      .click();
    await expect(gmPage.getByLabel('Character name')).toBeVisible({ timeout: 30_000 });

    const charName = uniqueName('No Detour');
    await buildBrackwaterCharacter(gmPage, charName);
    await gmPage.waitForURL(/\/characters\/[0-9a-f]{8}-[0-9a-f-]+$/, { timeout: 15_000 });
    await expect(gmPage.getByRole('heading', { name: charName })).toBeVisible();
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

  // --- Phase 5b: move / detach / clone ---

  test('detaches an in-campaign character back to standalone', async ({ gmPage }) => {
    const ruleset = await addBrackwater(gmPage);
    await createCampaign(gmPage, ruleset, uniqueName('Detach Job'));

    // Create a character INSIDE the campaign, then open its sheet from the roster.
    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/new$/);
    const charName = uniqueName('Defector');
    await buildBrackwaterCharacter(gmPage, charName);
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+$/, { timeout: 15_000 });
    await gmPage
      .locator('div')
      .filter({ has: gmPage.getByRole('heading', { name: charName }) })
      .filter({ has: gmPage.getByRole('link', { name: 'View' }) })
      .last()
      .getByRole('link', { name: 'View' })
      .click();
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+\/characters\/[0-9a-f-]+$/);

    // Return it to My Characters (two-click confirm) → it becomes standalone.
    await gmPage.getByRole('button', { name: 'Return to My Characters' }).click();
    await gmPage.getByRole('button', { name: /remove from campaign/i }).click();
    await gmPage.waitForURL(/\/characters\/[0-9a-f]{8}-[0-9a-f-]+$/, { timeout: 15_000 });
    await expect(gmPage.getByRole('heading', { name: charName })).toBeVisible();
    await expect(gmPage.getByRole('heading', { name: 'Bring to a campaign' })).toBeVisible();
  });

  test('moves a character from one campaign to another', async ({ gmPage }) => {
    const ruleset = await addBrackwater(gmPage);
    const campA = uniqueName('Campaign A');
    const campB = uniqueName('Campaign B');
    await createCampaign(gmPage, ruleset, campA);
    await createCampaign(gmPage, ruleset, campB);

    const charName = uniqueName('Mover');
    await buildStandaloneBrackwater(gmPage, charName);

    // Attach to A.
    await gmPage.getByLabel('Campaign').selectOption({ label: campA });
    await gmPage.getByRole('button', { name: 'Attach' }).click();
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+\/characters\/[0-9a-f-]+$/, { timeout: 15_000 });
    const gameAId = new URL(gmPage.url()).pathname.split('/')[2];

    // Move to B — wait until the sheet is on a DIFFERENT game's route (i.e. the move actually
    // navigated). The plain /games/<id>/characters/<id> regex matches BOTH A and B, so it could
    // resolve instantly against the pre-move URL; key on the gameId changing away from A.
    await gmPage.getByLabel('Campaign').selectOption({ label: campB });
    await gmPage.getByRole('button', { name: 'Move', exact: true }).click();
    await gmPage.waitForURL(
      url => {
        const m = url.pathname.match(/^\/games\/([0-9a-f-]+)\/characters\//);
        return !!m && m[1] !== gameAId;
      },
      { timeout: 15_000 }
    );

    // It's now in B's roster.
    await gmPage.getByRole('link', { name: /back to campaign/i }).click();
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+$/);
    await expect(gmPage.getByRole('heading', { name: campB })).toBeVisible();
    await expect(gmPage.getByRole('heading', { name: charName })).toBeVisible();
  });

  test('duplicates a character into a copy', async ({ gmPage }) => {
    await addBrackwater(gmPage);
    const charName = uniqueName('Original');
    await buildStandaloneBrackwater(gmPage, charName);

    // Duplicate from My Characters → lands on the copy's sheet.
    await gmPage.goto('/characters');
    await gmPage
      .locator('div')
      .filter({ has: gmPage.getByRole('heading', { name: charName }) })
      .filter({ has: gmPage.getByRole('button', { name: 'Duplicate' }) })
      .last()
      .getByRole('button', { name: 'Duplicate' })
      .click();
    await gmPage.waitForURL(/\/characters\/[0-9a-f]{8}-[0-9a-f-]+$/, { timeout: 15_000 });
    await expect(gmPage.getByRole('heading', { name: `${charName} (copy)` })).toBeVisible();
  });
});
