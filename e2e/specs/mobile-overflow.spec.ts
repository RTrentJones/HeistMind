// Phone-width layout gate (review item 9 / F91, F102): at 360px no page may scroll horizontally —
// the starter catalog's long "Add … to my rulesets" CTAs and the ruleset list's "Create campaign"
// buttons used to push 45–70px past the viewport (Button is whitespace-nowrap), and the BitD
// wizard's Close friend / Rival selects sized to their longest option (418px) and dragged the page
// to 438px, pushing the fixed Cancel/Back/Next footer off-screen (F102).
//
// Methodology (F102): the browser is a real phone emulation (isMobile + touch), and every width is
// compared with `visualViewport.width` — what the user actually sees. Under phone emulation the
// LAYOUT viewport (`window.innerWidth`) widens to fit overflowing content, so the old
// `scrollWidth <= innerWidth` style of check grew along with the bug and passed (that is how the
// wizard overflow went unreported for two pixel rounds).

import type { Browser, BrowserContext, Page } from '@playwright/test';
import { isLocalStack } from '../support/env';
import { assignKnifeDots } from '../support/characters';
import { test, expect } from '../support/fixtures';
import { storageStatePath } from '../support/paths';
import { createCampaign, uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 300_000 });

const WIDTH = 360;
const HEIGHT = 740;

/**
 * A GM browser context emulating a 360px phone. The React Query devtools toggle (dev builds only)
 * floats over the bottom-right corner — exactly where the wizard's Next lives — so it's hidden.
 */
async function phoneContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    storageState: storageStatePath('gm'),
    viewport: { width: WIDTH, height: HEIGHT },
    isMobile: true,
    hasTouch: true,
  });
  await context.addInitScript(() => {
    const hide = () => {
      const style = document.createElement('style');
      style.textContent = '.tsqd-parent-container,.tsqd-open-btn-container{display:none!important}';
      document.head.appendChild(style);
    };
    if (document.head) hide();
    else document.addEventListener('DOMContentLoaded', hide);
  });
  return context;
}

/**
 * The document's width vs the VISUAL viewport, plus elements whose right edge passes it (ignoring
 * sr-only / zero-size / fixed nodes and content clipped by an in-viewport ancestor).
 */
async function overflowing(
  page: Page
): Promise<{ scrollWidth: number; viewport: number; offenders: string[] }> {
  return page.evaluate(() => {
    const width = window.visualViewport?.width ?? document.documentElement.clientWidth;
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
    return {
      scrollWidth: document.documentElement.scrollWidth,
      viewport: width,
      offenders: offenders.slice(0, 5),
    };
  });
}

/** Assert the page as it stands fits the phone's visual viewport. */
async function expectFits(page: Page, what: string) {
  const { scrollWidth, viewport, offenders } = await overflowing(page);
  expect(viewport, 'phone emulation keeps a 360px visual viewport').toBe(WIDTH);
  expect(offenders, `${what} has elements past ${viewport}px`).toEqual([]);
  expect(scrollWidth, `${what} scrolls horizontally`).toBeLessThanOrEqual(viewport);
}

async function expectNoOverflow(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await expectFits(page, path);
}

/**
 * Where `locator`'s centre sits relative to the VISUAL viewport, and whether a tap there lands on
 * it (nothing else on top). A fixed footer pinned to a widened layout viewport fails this.
 */
async function tapPoint(page: Page, name: string) {
  return page.evaluate(label => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent?.trim() === label
    );
    if (!btn) return null;
    const vv = window.visualViewport!;
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return {
      // Relative to what's on screen (getBoundingClientRect is layout-viewport relative).
      left: r.left - vv.offsetLeft,
      right: r.right - vv.offsetLeft,
      top: r.top - vv.offsetTop,
      bottom: r.bottom - vv.offsetTop,
      vw: vv.width,
      vh: vv.height,
      x: x - vv.offsetLeft,
      y: y - vv.offsetTop,
      hits: !!hit && (hit === btn || btn.contains(hit)),
    };
  }, name);
}

test.describe('360px: no horizontal overflow on any page (mobile-overflow)', () => {
  test.beforeEach(() => {
    test.skip(!isLocalStack(), 'Requires the local Supabase stack.');
  });

  test('static routes, a campaign hub, every wizard step and a sheet fit a 360px phone', async ({
    gmPage,
    browser,
  }) => {
    // Seed what the data routes need (at desktop size): Brackwater in my rulesets and a campaign.
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets|Refresh my Brackwater copy/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' }).last()).toBeVisible({
      timeout: 30_000,
    });
    const ruleset = { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
    const hubPath = new URL(await createCampaign(gmPage, ruleset, uniqueName('Phone Job')))
      .pathname;

    const context = await phoneContext(browser);
    const page = await context.newPage();
    try {
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
        await expectNoOverflow(page, path);
      }

      // A real character sheet, built through the wizard AT PHONE WIDTH — every step checked.
      await page.goto('/characters/new');
      await page
        .locator('div')
        .filter({ hasText: 'Brackwater' })
        .filter({ has: page.getByRole('button', { name: 'Build' }) })
        .last()
        .getByRole('button', { name: 'Build' })
        .click();
      await page.getByLabel('Character name').fill(uniqueName('Phone'));
      await page.getByRole('button', { name: 'The Knife' }).click();
      await expectFits(page, 'wizard: playbook');
      const next = page.getByRole('button', { name: 'Next', exact: true });
      await next.click(); // → action ratings
      await assignKnifeDots(page);
      await expectFits(page, 'wizard: action ratings');
      for (let i = 0; i < 6; i++) {
        await next.click();
        const step = (await page.getByRole('heading', { level: 1 }).textContent()) ?? `${i}`;
        await expectFits(page, `wizard: ${step.trim()}`);
      }
      await page.getByRole('button', { name: 'Create character' }).click();
      await page.waitForURL(/\/characters\/[0-9a-f]{8}-[0-9a-f-]+$/, { timeout: 30_000 });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expectNoOverflow(page, new URL(page.url()).pathname);
    } finally {
      await context.close();
    }
  });

  // F102 / round-5 P0-1 — the BitD vice step: the Close friend / Rival selects list
  // "name — description" options; unconstrained, a native select sized to the longest (418px),
  // the page went 438px wide and the fixed footer's Next sat off-screen, untappable.
  test('BitD wizard identity step: page fits and Next is on screen and tappable', async ({
    gmPage,
    browser,
  }) => {
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', {
        name: /Add Blades in the Dark to my rulesets|Refresh my Blades in the Dark copy/i,
      })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Blades in the Dark' }).last()).toBeVisible({
      timeout: 30_000,
    });
    await gmPage.goto('/games/new');
    const rulesetSelect = gmPage.getByLabel('Ruleset', { exact: true });
    const option = rulesetSelect.locator('option', { hasText: /^Blades in the Dark \(v/ }).first();
    await rulesetSelect.selectOption({ label: (await option.textContent()) ?? '' });
    await gmPage.getByLabel('Campaign name').fill(uniqueName('The Phone Score'));
    await gmPage.getByRole('button', { name: 'Create campaign' }).click();
    await expect(gmPage).toHaveURL(/\/games\/[0-9a-f-]+$/, { timeout: 15_000 });
    const hubPath = new URL(gmPage.url()).pathname;

    const context = await phoneContext(browser);
    const page = await context.newPage();
    try {
      await page.goto(`${hubPath}/characters/new`);
      await page.getByLabel('Character name').fill(uniqueName('Kira'));
      await page.getByRole('button', { name: 'The Hound' }).click();
      const next = page.getByRole('button', { name: 'Next', exact: true });
      await next.click(); // → action ratings (Hound seeds Hunt 2 + Survey 1; place 4 more)
      for (const action of ['Study', 'Tinker', 'Prowl', 'Finesse'])
        await page.getByRole('button', { name: `Set ${action} to 1` }).click();
      await next.click(); // → special ability (seeded)
      await next.click(); // → heritage
      await next.click(); // → background
      await next.click(); // → vice (+ close friend / rival)
      const friend = page.getByLabel('Close friend');
      await expect(friend).toBeVisible();
      await expect(page.getByRole('heading', { level: 1, name: 'Vice' })).toBeVisible();
      await page.getByRole('button', { name: /^Faith/ }).click();
      await friend.selectOption({ index: 2 }); // "A pet hound or hawk — Loyal, and a useful …"
      await page.getByLabel('Rival').selectOption({ index: 1 });
      // Back to where a user lands, then measure what they can see.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      await expectFits(page, 'BitD wizard: vice / contacts step');

      const tap = await tapPoint(page, 'Next');
      expect(tap, 'the wizard footer has a Next button').not.toBeNull();
      expect(tap!.left, 'Next starts on screen').toBeGreaterThanOrEqual(0);
      expect(tap!.right, 'Next ends on screen (horizontally)').toBeLessThanOrEqual(tap!.vw);
      expect(tap!.top, 'Next is on screen (vertically)').toBeGreaterThanOrEqual(0);
      expect(tap!.bottom, 'Next sits above the bottom edge').toBeLessThanOrEqual(tap!.vh);
      expect(tap!.hits, 'nothing covers Next').toBe(true);
      // A real tap where the user sees it — no scrolling or panning first — advances the step.
      await page.touchscreen.tap(tap!.x, tap!.y);
      await expect(page.getByRole('heading', { level: 1, name: 'Review' })).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
