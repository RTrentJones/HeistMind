// LOCAL capture spec — reproducible product screenshots, NOT part of the suite's intent (assertions).
// It drives the real product with the injected GM session and writes full-page PNGs to e2e/.shots/
// (git-ignored). Skips unless the local Supabase stack is up, so it's inert in CI (which runs against a
// deployed PLAYWRIGHT_BASE_URL). Best-effort: each screenshot is guarded so one bad selector doesn't
// abort the rest. Reuses the known-good cinders wizard flow (gm-full-journey) + clocks (gm-clocks).
//
// The site repo's capture tool (RTrentJones.dev scripts/capture-shots.mjs, `raw` mode) crops the PNGs
// this produces into apps/blog/public/heistmind-*.png for the project write-up. Run:
//   set -a; . apps/web/.env.local; set +a
//   node_modules/.bin/playwright test e2e/specs/capture-shots.spec.ts --project=chromium
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { isLocalStack } from '../support/env';
import { test, expect, type Page } from '../support/fixtures';
import { createCampaign, uniqueName, uploadRuleset } from '../support/rulesets';

const SHOTS = join(process.cwd(), 'e2e', '.shots');
const VIEWPORT = { width: 1440, height: 900 };

async function shot(page: Page, name: string, fullPage = true): Promise<void> {
  try {
    // Hide dev-only overlays (Next.js indicator, Vercel/live toolbar) so shots look like prod.
    await page
      .addStyleTag({
        content: `nextjs-portal,[data-nextjs-toast],#__next-build-watcher,[data-next-badge-root],[data-vercel-toolbar],vercel-live,vercel-live-feedback,[data-testid="vercel-toolbar"],[class*="live-feedback"],.tsqd-parent-container,[class*="tsqd"],.ReactQueryDevtools{display:none!important}`,
      })
      .catch(() => undefined);
    await page.waitForTimeout(500); // let animations/data settle
    await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage });
    console.log(`  ✓ captured ${name}`);
  } catch (e) {
    console.log(`  ✗ ${name}: ${(e as Error).message}`);
  }
}

test.describe('capture', () => {
  test.beforeEach(() => {
    test.skip(!isLocalStack(), 'Needs the local Supabase stack.');
    mkdirSync(SHOTS, { recursive: true });
  });

  test('GM product screens', async ({ gmPage }) => {
    test.setTimeout(240_000);
    await gmPage.setViewportSize(VIEWPORT);

    // 1. Campaign from the full cinders ruleset (known wizard shape).
    const ruleset = await uploadRuleset(gmPage, 'cinders.json', uniqueName('Cinders & Coin'));
    const gameUrl = await createCampaign(gmPage, ruleset, 'The Harbormaster Job');

    // 2. Progress clocks — the iconic FitD shared-state visual.
    try {
      await gmPage.getByLabel('New clock').fill('The Alarm');
      await gmPage.getByRole('button', { name: 'Add clock' }).click();
      await expect(gmPage.getByText('The Alarm 0/4')).toBeVisible({ timeout: 10_000 });
      await gmPage.getByRole('button', { name: 'Advance The Alarm' }).click();
      await gmPage.getByRole('button', { name: 'Advance The Alarm' }).click();
      await gmPage.getByLabel('New clock').fill('Rising Heat');
      await gmPage.getByRole('button', { name: 'Add clock' }).click();
      await expect(gmPage.getByText('Rising Heat 0/4')).toBeVisible({ timeout: 10_000 });
      await gmPage.getByRole('button', { name: 'Advance Rising Heat' }).click();
    } catch (e) {
      console.log(`  ! clocks step: ${(e as Error).message}`);
    }

    // 3. Build a character through the ruleset-driven wizard, capturing the distinctive steps.
    try {
      await gmPage.getByRole('link', { name: 'Create character' }).click();
      await expect(gmPage).toHaveURL(/\/characters\/new$/);
      await gmPage.getByLabel('Character name').fill('Asher Vane');
      await gmPage.getByRole('button', { name: 'The Razor' }).click();
      await shot(gmPage, '02-wizard-playbook');

      await gmPage.getByRole('button', { name: 'Next', exact: true }).click(); // → attributes
      await expect(gmPage.getByText(/\/ 7 points spent/)).toBeVisible({ timeout: 15_000 });
      await shot(gmPage, '03-wizard-attributes');

      await gmPage.getByRole('button', { name: 'Next', exact: true }).click(); // → abilities
      await expect(gmPage.getByText('Tier 1', { exact: true }).first()).toBeVisible();
      await gmPage.getByRole('button', { name: 'Next', exact: true }).click(); // → crew-ties
      await gmPage.getByRole('button', { name: 'Loyal' }).click();
      await gmPage.getByRole('button', { name: 'Next', exact: true }).click(); // → identity
      await gmPage.getByRole('button', { name: 'Next', exact: true }).click(); // → confirm
      await gmPage.getByRole('button', { name: 'Create character' }).click();
      await expect(gmPage).toHaveURL(/\/games\/[0-9a-f-]+$/, { timeout: 20_000 });
    } catch (e) {
      console.log(`  ! wizard step: ${(e as Error).message}`);
    }

    // 4. The campaign page now has a character + ticking clocks — the "shared truth" view.
    await gmPage.goto(gameUrl);
    // Wait for the client-rendered data, not networkidle (which raced the fetch and caught the spinner).
    await gmPage
      .getByRole('heading', { name: 'The Harbormaster Job' })
      .waitFor({ timeout: 25_000 })
      .catch(() => undefined);
    await gmPage
      .getByText('The Alarm', { exact: false })
      .first()
      .waitFor({ timeout: 15_000 })
      .catch(() => undefined);
    await gmPage
      .getByText('Asher Vane', { exact: false })
      .first()
      .waitFor({ timeout: 15_000 })
      .catch(() => undefined);
    await gmPage.waitForTimeout(1200);
    await shot(gmPage, '01-campaign');

    // 5. The character sheet — the FitD tracker (stress/harm/XP, action ratings, abilities).
    try {
      await gmPage.getByRole('link', { name: 'View' }).first().click();
      await expect(gmPage).toHaveURL(/\/characters\/[0-9a-f-]+$/, { timeout: 15_000 });
      await gmPage.waitForLoadState('networkidle').catch(() => undefined);
      await shot(gmPage, '04-character-sheet');
    } catch (e) {
      console.log(`  ! sheet step: ${(e as Error).message}`);
    }

    // 6. The games dashboard.
    await gmPage.goto('/games');
    await gmPage.waitForLoadState('networkidle').catch(() => undefined);
    await shot(gmPage, '05-games');
  });
});
