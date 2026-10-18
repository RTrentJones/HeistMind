// Logged-in home — `/` renders the personal Dashboard once a session is present (marketing shows
// when signed out, covered by home.spec.ts). The gmPage fixture injects a real Supabase session, so
// visiting `/` should land on the dashboard chrome: the welcome heading, the quick actions, and the
// "your campaigns" / "your characters" sections (which render their headings even with no data yet).
//
// Skips automatically when no service-role key is configured (fixture guard).

import { hasAdminAuth, isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName, uploadRuleset } from '../support/rulesets';
import { throwawayPage } from '../support/personas';

test.describe('dashboard (authenticated /)', () => {
  test('an injected session lands on the personal dashboard', async ({ gmPage }) => {
    await gmPage.goto('/');

    // Dashboard-only welcome heading (the header shows "Welcome, X" as text, not a heading).
    // "Welcome back" only for returning users (F94) — the shared persona may be either.
    await expect(gmPage.getByRole('heading', { name: /^welcome/i })).toBeVisible({
      timeout: 15_000,
    });

    // Either the first-run "Start here" or the "your stuff" sections, plus a primary action.
    await expect(
      gmPage
        .getByRole('heading', { name: /start here/i })
        .or(gmPage.getByRole('heading', { name: /your campaigns/i }))
    ).toBeVisible();
    await expect(gmPage.getByRole('link', { name: /create campaign/i }).first()).toBeVisible();
  });

  // F94 — a brand-new account gets "Welcome" (not "back"), ONE Start-here card with four real
  // steps (incl. Discord) and none of the three redundant empty sections.
  test('first run: Welcome, a single Start here (with a Discord step), no empty sections', async ({
    browser,
  }) => {
    test.skip(!isLocalStack() || !hasAdminAuth(), 'Requires the local Supabase stack.');
    const fresh = await throwawayPage(browser);
    try {
      const { page } = fresh;
      await page.goto('/');
      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toHaveText(/^welcome, /i, { timeout: 15_000 });
      await expect(h1).not.toHaveText(/back/i);
      const start = page.getByTestId('dashboard-start-here');
      await expect(start).toBeVisible();
      for (const step of ['Build a character', 'Create a campaign', 'Join a campaign']) {
        await expect(start.getByRole('link', { name: step })).toBeVisible();
      }
      await expect(start.getByRole('link', { name: /playing on discord/i })).toHaveAttribute(
        'href',
        '/discord'
      );
      // The dev server runs with a test NEXT_PUBLIC_DISCORD_APP_ID → the install button shows.
      const install = start.getByRole('link', { name: /add heistmind to your discord server/i });
      if (await install.count()) {
        await expect(install).toHaveAttribute(
          'href',
          /discord\.com\/oauth2\/authorize\?client_id=/
        );
      }
      await expect(page.getByRole('heading', { name: /your campaigns/i })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: /your characters/i })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: /recent activity/i })).toHaveCount(0);
      await expect(page.getByText(/open a campaign to build/i)).toHaveCount(0);
    } finally {
      await fresh.dispose();
    }
  });

  // F79 — the chrome-only assertion above would stay green if the sections never rendered a
  // user's actual data. Seed a campaign through the UI, then assert `/` really lists it, and
  // that every section resolves past its load to an affordance (content or an empty-state CTA).
  test('dashboard lists a campaign the GM owns, and every section resolves', async ({ gmPage }) => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + admin provisioning).'
    );
    test.setTimeout(90_000); // upload + create cold-compile several dev-server routes

    const ruleset = await uploadRuleset(gmPage, 'veil.json', uniqueName('Veil & Vow'));
    const campaign = uniqueName('Dashboard Campaign');
    await createCampaign(gmPage, ruleset, campaign);

    await gmPage.goto('/');
    await expect(gmPage.getByRole('heading', { name: /welcome back/i })).toBeVisible({
      timeout: 15_000,
    });

    // Real content: the campaign just created is listed under "Your campaigns".
    await expect(gmPage.getByRole('heading', { name: campaign })).toBeVisible();

    // The characters section resolves to content or its empty-state CTA — never a blank gap.
    await expect(gmPage.getByRole('link', { name: /new character|view/i }).first()).toBeVisible();

    // Every section's spinner resolves (spinners render role='status'); the recent-activity
    // section then shows either rows or its empty-state copy — not nothing. Scope to <main>
    // and match rows by their relative-time stamp ("just now" / "3m ago"): the old loose
    // /in .+$/ regex latched the page's hidden <title> and could never pass.
    await expect(gmPage.getByRole('heading', { name: /recent activity/i })).toBeVisible();
    await expect(gmPage.getByRole('main').getByRole('status')).toHaveCount(0, { timeout: 15_000 });
    const mainEl = gmPage.getByRole('main');
    await expect(
      mainEl
        .getByText(/no recent activity/i)
        .or(mainEl.getByText(/just now|\d+[mhd] ago/).first())
        .first()
    ).toBeVisible();
  });

  // F79 / F91: Recent activity must go straight from loading to the rows — the empty copy must
  // NEVER render in between (the per-campaign fan-out only starts once campaigns resolve, which
  // used to flash "No recent activity"). A MutationObserver installed before any page script
  // records whether the empty state was ever attached, so the assertion can't pass on a flash.
  test('recent activity shows the logged event without ever flashing the empty state', async ({
    gmPage,
  }) => {
    test.skip(!isLocalStack(), 'Requires the local Supabase stack.');
    test.setTimeout(120_000);
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' }).last()).toBeVisible({
      timeout: 30_000,
    });
    const ruleset = { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
    await createCampaign(gmPage, ruleset, uniqueName('Activity Job'));
    const note = `Dashboard activity ${Date.now()}`;
    await gmPage.getByLabel('What happened').fill(note);
    await gmPage.getByRole('button', { name: 'Add to log' }).click();
    await expect(gmPage.getByText(note)).toBeVisible({ timeout: 10_000 });

    await gmPage.addInitScript(() => {
      const w = window as unknown as { emptyActivitySeen?: boolean };
      w.emptyActivitySeen = false;
      new MutationObserver(() => {
        if (document.querySelector('[data-testid="dashboard-activity-empty"]')) {
          w.emptyActivitySeen = true;
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await gmPage.goto('/');
    const list = gmPage.getByTestId('dashboard-activity-list');
    await expect(list.getByText(note)).toBeVisible({ timeout: 20_000 });
    const flashed = await gmPage.evaluate(
      () => (window as unknown as { emptyActivitySeen?: boolean }).emptyActivitySeen
    );
    expect(flashed).toBe(false);
  });
});
