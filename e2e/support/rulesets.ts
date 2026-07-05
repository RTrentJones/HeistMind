// Shared helpers for the GM ruleset → campaign flows. Kept here (not inlined in specs)
// so gm-games and gm-full-journey drive the UI identically.
//
// Every ruleset gets a UNIQUE display name per test (the fixture's metadata.name is
// overwritten). `rulesets.findByCreator` lists *all* of the GM persona's rulesets, and
// the persona persists for the whole run — so a stable name would collide across tests
// and reruns. A per-test name keeps every selector (list heading, <select> option)
// unambiguous regardless of how much data has accumulated.

import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';
import { E2E_ROOT } from './paths';

export const FIXTURE_DIR = join(E2E_ROOT, 'fixtures', 'rulesets');

export const fixturePath = (name: string): string => join(FIXTURE_DIR, name);

/** A unique, human-readable name so list/select selectors never collide across tests. */
export const uniqueName = (prefix: string): string => `${prefix} ${randomUUID().slice(0, 8)}`;

interface UploadedRuleset {
  /** The unique name the ruleset was uploaded under (matches its list heading). */
  name: string;
  version: string;
  /** The exact <select> option text on /games/new: `${name} (v${version})`. */
  optionLabel: string;
}

/**
 * Upload a fixture ruleset via the JSON-paste path, under a unique name. Asserts the
 * upload succeeds (redirect to /rulesets) and the ruleset is listed. Returns the
 * identifiers later steps need to address it unambiguously.
 */
export async function uploadRuleset(
  page: Page,
  fixture: string,
  name: string = uniqueName('Ruleset')
): Promise<UploadedRuleset> {
  const content = JSON.parse(readFileSync(fixturePath(fixture), 'utf8'));
  content.metadata.name = name;
  const version: string = content.metadata.version;

  await page.goto('/rulesets/new');
  await expect(page.getByRole('heading', { name: 'Upload a Ruleset' })).toBeVisible();
  await page.getByLabel('Ruleset JSON', { exact: true }).fill(JSON.stringify(content));
  // The IP attestation checkbox gates the upload button (every upload path goes through here).
  await page.getByLabel(/right to upload this content/i).check();
  await page.getByRole('button', { name: 'Upload ruleset' }).click();

  await expect(page).toHaveURL(/\/rulesets$/);
  await expect(page.getByRole('heading', { name })).toBeVisible();

  return { name, version, optionLabel: `${name} (v${version})` };
}

/**
 * Create a campaign from an uploaded ruleset (selected by its unique option label) and
 * land on the game-detail page. Returns the new game's URL.
 */
export async function createCampaign(
  page: Page,
  ruleset: UploadedRuleset,
  campaignName: string = uniqueName('Campaign')
): Promise<string> {
  await page.goto('/games/new');
  await expect(page.getByRole('heading', { name: 'Create a Campaign' })).toBeVisible();
  await page.getByLabel('Ruleset', { exact: true }).selectOption({ label: ruleset.optionLabel });
  await page.getByLabel('Campaign name').fill(campaignName);
  await page.getByRole('button', { name: 'Create campaign' }).click();

  await expect(page).toHaveURL(/\/games\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { name: campaignName })).toBeVisible();
  return page.url();
}
