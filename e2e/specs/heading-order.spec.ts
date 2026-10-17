// F94 / pixel review #16 — axe `heading-order` on the app pages: card titles that follow the page
// h1 must be h2 (they were h3 on /games, /games/new, /characters, /characters/new, /rulesets/new,
// the hub and the sheets), and each page has exactly one h1. Uses a throwaway persona so the
// pages carry real content (a campaign, a campaign character, a standalone character).
import { isLocalStack, hasAdminAuth } from '../support/env';
import { test, expect } from '../support/fixtures';
import { headingOrderViolations, h1Texts } from '../support/a11y';
import { throwawayPage } from '../support/personas';
import { createCampaign, uniqueName } from '../support/rulesets';
import {
  addBrackwater,
  buildCampaignBrackwater,
  buildStandaloneBrackwater,
} from '../support/characters';

test.describe.configure({ timeout: 240_000 });

test('every app page keeps heading order (h1 → h2 → h3) with a single h1', async ({ browser }) => {
  test.skip(!isLocalStack() || !hasAdminAuth(), 'Requires the local Supabase stack.');
  const gm = await throwawayPage(browser);
  try {
    const { page } = gm;
    const ruleset = await addBrackwater(page);
    const hub = await createCampaign(page, ruleset, uniqueName('Heading Hub'));
    await page.getByRole('button', { name: 'Create a join code' }).click();
    await expect(page.getByTestId('join-code-row')).toHaveCount(1, { timeout: 10_000 });
    await buildCampaignBrackwater(page, hub, uniqueName('Heading Crew'));
    const campaignSheet = page.url();
    await buildStandaloneBrackwater(page, uniqueName('Heading Solo'));
    const standaloneSheet = page.url();

    const pages = [
      '/games',
      '/games/new',
      '/characters',
      '/characters/new',
      '/rulesets',
      '/rulesets/new',
      '/discord',
      '/settings',
      hub,
      campaignSheet,
      standaloneSheet,
      '/join/NOPE2345',
    ];
    const failures: string[] = [];
    for (const path of pages) {
      await page.goto(path);
      await expect(page.locator('h1:visible').first()).toBeVisible({ timeout: 20_000 });
      // Let client queries settle before reading the outline.
      await page.waitForLoadState('networkidle');
      const jumps = await headingOrderViolations(page);
      const h1s = await h1Texts(page);
      if (jumps.length) failures.push(`${path}: ${JSON.stringify(jumps)}`);
      if (h1s.length !== 1) failures.push(`${path}: h1 count ${h1s.length} ${JSON.stringify(h1s)}`);
    }
    expect(failures).toEqual([]);
  } finally {
    await gm.dispose();
  }
});

test('first-run pages (no rulesets yet) keep heading order too', async ({ browser }) => {
  test.skip(!isLocalStack() || !hasAdminAuth(), 'Requires the local Supabase stack.');
  const fresh = await throwawayPage(browser);
  try {
    const { page } = fresh;
    const failures: string[] = [];
    for (const path of [
      '/',
      '/games',
      '/games/new',
      '/characters',
      '/characters/new',
      '/rulesets',
    ]) {
      await page.goto(path);
      await expect(page.locator('h1:visible').first()).toBeVisible({ timeout: 20_000 });
      await page.waitForLoadState('networkidle');
      const jumps = await headingOrderViolations(page);
      if (jumps.length) failures.push(`${path}: ${JSON.stringify(jumps)}`);
      const h1s = await h1Texts(page);
      if (h1s.length !== 1) failures.push(`${path}: h1 count ${h1s.length}`);
    }
    expect(failures).toEqual([]);
  } finally {
    await fresh.dispose();
  }
});
