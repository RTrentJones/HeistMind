// Sign-in gates (F72) — every auth-required route, primary or secondary, shows the SignInGate
// (heading + a working Discord sign-in CTA + the clickwrap notice) when signed out. The six
// secondary routes used to render a bare "please sign in" text with no way to act on it; this
// spec pins the fix so the dead-end can't regress. Anonymous — no backend or session needed:
// each page's auth check runs before any data fetch, so the fake UUIDs are never queried.
//
// Also pins F81: the authenticated header nav reaches "My characters".

import { test, expect } from '../support/fixtures';
import { onComingSoon } from '../support/coming-soon';

// Any well-formed UUIDs work — the gate renders before the route params are used.
const GAME_ID = '00000000-0000-4000-8000-000000000000';
const CHARACTER_ID = '00000000-0000-4000-8000-000000000001';

const GATED_ROUTES = [
  { path: '/games/new', label: 'create campaign' },
  { path: `/games/${GAME_ID}/characters/new`, label: 'campaign character wizard' },
  { path: `/games/${GAME_ID}/characters/${CHARACTER_ID}`, label: 'campaign character sheet' },
  { path: '/characters/new', label: 'standalone character wizard' },
  { path: `/characters/${CHARACTER_ID}`, label: 'standalone character sheet' },
  { path: '/rulesets/new', label: 'ruleset upload' },
];

test.describe('sign-in gates on secondary routes (anonymous, F72)', () => {
  for (const { path, label } of GATED_ROUTES) {
    test(`${label} shows the SignInGate, not a dead-end prompt`, async ({ page }) => {
      await page.goto(path);

      const cta = page.getByRole('main').getByRole('button', { name: /sign in with discord/i });
      test.skip(await onComingSoon(page, cta), 'prod coming-soon gate — no sign-in is shown');

      // The gate's working CTA + the clickwrap it carries — the affordances the bare text lacked.
      await expect(cta).toBeVisible();
      await expect(page.getByText(/by signing in, you agree to the/i).first()).toBeVisible();
    });
  }
});

test.describe('header nav (authenticated, F81)', () => {
  test('the persistent nav links My characters', async ({ gmPage }) => {
    await gmPage.goto('/');
    await expect(gmPage.getByRole('heading', { name: /welcome back/i })).toBeVisible({
      timeout: 15_000,
    });

    // The header nav link (not the dashboard section's "manage characters" affordance).
    await gmPage
      .getByRole('banner')
      .getByRole('link', { name: /^characters$/i })
      .click();
    await expect(gmPage).toHaveURL(/\/characters$/);
    await expect(gmPage.getByRole('heading', { name: /my characters/i })).toBeVisible();
  });
});
