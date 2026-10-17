// Server rendering + hydration (F90). Every page used to server-render only a splash with the raw
// key `common.loading.preparingShadows` (an i18n "ready?" gate held the whole tree behind a client
// effect). Pin the fix from both sides:
//   1. the raw HTML of the public pages carries their real copy (what crawlers, link unfurlers
//      and the first paint see), and
//   2. hydrating that HTML logs no React hydration mismatch — anonymously AND for a returning
//      signed-in user, whose persisted auth hint must not be read before hydration completes.

import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';

/** React hydration mismatches (dev wording + the minified prod error codes) and the dual-client warning. */
const PROBLEM =
  /hydrat|did not match|server rendered|Minified React error #(418|419|422|423|425)|Multiple GoTrueClient/i;

function collectProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', msg => {
    if ((msg.type() === 'error' || msg.type() === 'warning') && PROBLEM.test(msg.text())) {
      problems.push(`[console.${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    if (PROBLEM.test(err.message)) problems.push(`[pageerror] ${err.message}`);
  });
  return problems;
}

test.describe('server-rendered HTML (no client gate)', () => {
  const PAGES: Array<{ path: string; text: RegExp }> = [
    // `/` is the marketing landing, or the holding page on gated prod.
    { path: '/', text: /mechanical home for your Forged-in-the-Dark crew|coming soon/i },
    { path: '/legal/terms', text: /Terms of Service/ },
    { path: '/legal/privacy', text: /Privacy Policy/ },
  ];

  for (const { path, text } of PAGES) {
    test(`${path} ships its real copy in the initial HTML`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      const html = await res.text();
      expect(html).toMatch(text);
      expect(html).not.toContain('common.loading');
    });
  }

  test('/discord ships the bot guide in the initial HTML (when not gated)', async ({ request }) => {
    const res = await request.get('/discord');
    const html = await res.text();
    test.skip(!res.url().endsWith('/discord'), 'prod coming-soon gate redirects /discord to /');
    expect(html).toMatch(/HeistMind on Discord/);
    expect(html).not.toContain('common.loading');
  });

  test('an unknown route server-renders the friendly 404', async ({ request }) => {
    const res = await request.get('/definitely-not-a-page');
    expect(res.status()).toBe(404);
    const html = await res.text();
    expect(html).toMatch(/Lost in the shadows/);
    expect(html).not.toContain('common.loading');
  });
});

test.describe('hydration', () => {
  test('anonymous pages hydrate without a mismatch', async ({ page }) => {
    const problems = collectProblems(page);
    for (const path of ['/', '/legal/privacy', '/games']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }
    expect(problems).toEqual([]);
  });

  test('a returning signed-in user hydrates without a mismatch', async ({ gmPage }) => {
    // First load signs the injected session in and persists the auth hint to localStorage —
    // the state that used to make the first client render differ from the server HTML.
    await gmPage.goto('/');
    await expect(gmPage.getByRole('button', { name: /sign out/i })).toBeVisible({
      timeout: 15_000,
    });

    const problems = collectProblems(gmPage);
    for (const path of ['/', '/games', '/characters', '/settings']) {
      await gmPage.goto(path);
      await expect(gmPage.getByRole('button', { name: /sign out/i })).toBeVisible({
        timeout: 15_000,
      });
      await gmPage.waitForLoadState('networkidle');
    }
    // A signed-in visitor never sees the sign-in gate on an app page.
    await expect(gmPage.getByRole('button', { name: /sign in with discord/i })).toHaveCount(0);
    expect(problems).toEqual([]);
  });
});
