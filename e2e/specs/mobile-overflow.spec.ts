// Phone-width layout gate (review item 9 / F91): at 360px no page may scroll horizontally — the
// starter catalog's long "Add … to my rulesets" CTAs and the ruleset list's "Create game" buttons
// used to push 45–70px past the viewport (Button is whitespace-nowrap). Every signed-in route is
// visited at 360×740 and its document width compared with the viewport, plus a check that no
// visible element's right edge pokes past it.

import type { Page } from '@playwright/test';
import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 240_000 });

const WIDTH = 360;

/** Elements whose right edge passes the viewport (ignoring sr-only / zero-size nodes). */
async function overflowing(page: Page): Promise<{ scrollWidth: number; offenders: string[] }> {
  return page.evaluate(width => {
    const offenders: string[] = [];
    // Content clipped by an in-viewport ancestor (overflow hidden/clip/auto/scroll) can't widen
    // the page, so it isn't an offender — e.g. decorative SVGs inside a rounded, clipped card.
    const clipped = (el: Element): boolean => {
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX;
        if (ox !== 'visible' && a.getBoundingClientRect().right <= width + 1) return true;
      }
      return false;
    };
    for (const el of Array.from(document.body.querySelectorAll<Element>('*'))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (getComputedStyle(el).position === 'fixed') continue;
      if (r.right > width + 1 && !clipped(el)) {
        offenders.push(
          `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 40)}" → ${Math.round(r.right)}px`
        );
      }
    }
    return { scrollWidth: document.documentElement.scrollWidth, offenders: offenders.slice(0, 5) };
  }, WIDTH);
}

async function expectNoOverflow(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  const { scrollWidth, offenders } = await overflowing(page);
  expect(offenders, `${path} has elements past ${WIDTH}px`).toEqual([]);
  expect(scrollWidth, `${path} scrolls horizontally`).toBeLessThanOrEqual(WIDTH);
}

test.describe('360px: no horizontal overflow on any page (mobile-overflow)', () => {
  test.beforeEach(() => {
    test.skip(!isLocalStack(), 'Requires the local Supabase stack.');
  });

  test('static routes, a campaign hub, and a character sheet fit a 360px phone', async ({
    gmPage,
  }) => {
    await gmPage.setViewportSize({ width: WIDTH, height: 740 });

    // Seed what the data routes need: Brackwater in my rulesets, a campaign, a standalone character.
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' }).last()).toBeVisible({
      timeout: 30_000,
    });
    const ruleset = { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
    const hubPath = new URL(await createCampaign(gmPage, ruleset, uniqueName('Phone Job')))
      .pathname;

    for (const path of [
      '/',
      '/games',
      '/games/new',
      '/characters',
      '/characters/new',
      '/rulesets',
      '/rulesets/new',
      '/settings',
      hubPath,
    ]) {
      await expectNoOverflow(gmPage, path);
    }

    // A real character sheet (standalone build through the wizard). Build at desktop width — in
    // dev the floating React Query devtools button covers the wizard's Next at 360px — then
    // check the finished sheet at phone width.
    await gmPage.setViewportSize({ width: 1280, height: 800 });
    await gmPage.goto('/characters/new');
    await gmPage
      .locator('div')
      .filter({ hasText: 'Brackwater' })
      .filter({ has: gmPage.getByRole('button', { name: 'Build' }) })
      .last()
      .getByRole('button', { name: 'Build' })
      .click();
    await gmPage.getByLabel('Character name').fill(uniqueName('Phone'));
    await gmPage.getByRole('button', { name: 'The Knife' }).click();
    const next = gmPage.getByRole('button', { name: 'Next', exact: true });
    for (let i = 0; i < 7; i++) await next.click();
    await gmPage.getByRole('button', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/[0-9a-f]{8}-[0-9a-f-]+$/, { timeout: 15_000 });
    await gmPage.setViewportSize({ width: WIDTH, height: 740 });
    await expect(gmPage.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoOverflow(gmPage, new URL(gmPage.url()).pathname);
  });
});
