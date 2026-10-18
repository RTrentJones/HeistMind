// Shared character/ruleset journeys (lifted from standalone-characters.spec.ts so the F94 specs
// reuse the SAME real paths — the bundled Brackwater starter from @heist-mind/shared via the UI,
// never an invented content shape).
import { expect, type Locator, type Page } from '@playwright/test';

/** Add (or refresh) the bundled Brackwater starter; returns its campaign-form identifiers. */
export async function addBrackwater(page: Page) {
  await page.goto('/rulesets');
  await page
    .getByRole('button', { name: /Add Brackwater to my rulesets|Refresh my Brackwater copy/i })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Brackwater' }).last()).toBeVisible({
    timeout: 30_000,
  });
  return { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
}

/** Build a Brackwater character through the wizard mounted on the page (standalone or in-campaign). */
export async function buildBrackwaterCharacter(page: Page, name: string) {
  await page.getByLabel('Character name').fill(name);
  await page.getByRole('button', { name: 'The Knife' }).click();
  const next = page.getByRole('button', { name: 'Next', exact: true });
  for (let i = 0; i < 7; i++) await next.click();
  await page.getByRole('button', { name: 'Create character' }).click();
}

/**
 * My Characters → New character → Brackwater → wizard. Lands on the standalone sheet. A user
 * without the ruleset yet gets the inline catalog (F37): "Add Brackwater" continues straight into
 * the wizard; otherwise the owned copy's "Build".
 */
export async function buildStandaloneBrackwater(page: Page, name: string) {
  await page.goto('/characters/new');
  const build = page
    .locator('div')
    .filter({ hasText: 'Brackwater' })
    .filter({ has: page.getByRole('button', { name: 'Build' }) })
    .last()
    .getByRole('button', { name: 'Build' });
  const add = page.getByRole('button', { name: /Add Brackwater to my rulesets/i }).first();
  await expect(build.or(add).first()).toBeVisible({ timeout: 20_000 });
  if (await build.count()) await build.click();
  else await add.click();
  await expect(page.getByLabel('Character name')).toBeVisible({ timeout: 30_000 });
  await buildBrackwaterCharacter(page, name);
  await page.waitForURL(/\/characters\/[0-9a-f]{8}-[0-9a-f-]+$/, { timeout: 30_000 });
}

/** From a campaign hub: Create character → wizard (returns to the hub) → open the new sheet. */
export async function buildCampaignBrackwater(page: Page, hubUrl: string, name: string) {
  await page.goto(`${hubUrl}/characters/new`);
  await buildBrackwaterCharacter(page, name);
  await page.waitForURL(/\/games\/[0-9a-f-]+$/, { timeout: 30_000 });
  await page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
    .getByRole('link', { name: 'View' })
    .last()
    .click();
  await page.waitForURL(/\/games\/[0-9a-f-]+\/characters\/[0-9a-f-]+$/, { timeout: 30_000 });
}

/** The character card (My Characters / roster / dashboard) whose title is exactly `name`. */
export function characterCard(page: Page, name: string): Locator {
  return page
    .getByTestId('character-card')
    .filter({ has: page.getByRole('heading', { name, exact: true }) });
}
