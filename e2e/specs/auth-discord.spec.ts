// Discord OAuth — wiring assertion only.
//
// We deliberately do NOT drive Discord's live consent screen (third-party UI, bot detection,
// MFA — not reliably scriptable). Instead we assert the app hands off correctly: clicking
// sign-in must navigate to Supabase's GoTrue /auth/v1/authorize endpoint with provider=discord
// and a redirect_to pointing back at our callback. That covers the part WE own; the live
// round-trip stays a documented manual check (see e2e/README.md).

import { test, expect } from '../support/fixtures';
import { effectiveOpacity } from '../support/a11y';
import { onComingSoon } from '../support/coming-soon';

test.describe('Discord sign-in wiring', () => {
  test('sign-in initiates the Supabase Discord OAuth redirect', async ({ page }) => {
    await page.goto('/');
    const signUp = page.getByRole('button', { name: /sign up with discord/i });
    test.skip(await onComingSoon(page, signUp), 'prod coming-soon gate — sign-in is not shown');

    // Capture the GoTrue authorize hand-off. We don't follow it into discord.com.
    const authorizeRequest = page.waitForRequest(req => /\/auth\/v1\/authorize/.test(req.url()), {
      timeout: 15_000,
    });

    await page.getByRole('button', { name: /sign up with discord/i }).click();

    const url = new URL((await authorizeRequest).url());
    expect(url.searchParams.get('provider')).toBe('discord');
    expect(url.searchParams.get('redirect_to') ?? '').toMatch(/\/auth\/callback/);
  });

  // Round 4 P2-N2 — the header paints from SSR, so a click can land BEFORE React hydrates. It used
  // to do nothing. The buttons are now a real GET form to /auth/signin (JS disabled stands in for
  // "not hydrated yet": no onClick exists), and that page starts the same OAuth once it runs.
  test('a click before hydration still starts the Discord sign-in', async ({ browser }) => {
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await noJs.newPage();
      await page.goto('/');
      const signUp = page.getByRole('button', { name: /sign up with discord/i });
      test.skip(await onComingSoon(page, signUp), 'prod coming-soon gate — sign-in is not shown');
      await signUp.click();
      await page.waitForURL(/\/auth\/signin/, { timeout: 15_000 });

      // The landing CTA keeps its intent through the no-JS path too.
      await page.goto('/');
      await page.getByRole('button', { name: 'Run a campaign' }).first().click();
      await page.waitForURL(/\/auth\/signin\?next=%2Fgames%2Fnew/, { timeout: 15_000 });

      // F102 — with JS genuinely OFF the OAuth (client-side PKCE) can't start: no endless spinner,
      // a plain explanation and a way back instead, inside a <main> landmark.
      const noscript = page.getByTestId('signin-noscript');
      await expect(noscript).toBeVisible();
      await expect(
        page.getByRole('heading', { level: 1, name: 'Sign-in needs JavaScript' })
      ).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Taking you to Discord' })).toBeHidden();
      await expect(page.getByRole('link', { name: 'Back to HeistMind' })).toHaveAttribute(
        'href',
        '/'
      );
      await expect(page.getByRole('main')).toHaveCount(1);
    } finally {
      await noJs.close();
    }

    // Hydrated, /auth/signin hands off to GoTrue's authorize endpoint with the same `next`.
    const ctx = await browser.newContext();
    try {
      const page = await ctx.newPage();
      const authorizeRequest = page.waitForRequest(req => /\/auth\/v1\/authorize/.test(req.url()), {
        timeout: 20_000,
      });
      await page.goto('/auth/signin?next=%2Fgames%2Fnew');
      const url = new URL((await authorizeRequest).url());
      expect(url.searchParams.get('provider')).toBe('discord');
      const redirectTo = new URL(url.searchParams.get('redirect_to') ?? '');
      expect(redirectTo.pathname).toBe('/auth/callback');
      expect(redirectTo.searchParams.get('next')).toBe('/games/new');
    } finally {
      await ctx.close();
    }
  });

  // Round 6 P1-1 — F102's JS-off message was in the DOM but INVISIBLE: it sat inside the shared
  // Card, whose framer-motion entrance SSRs at `opacity: 0` and only fades in once JS runs. The
  // page was a blank gradient. `toBeVisible()` passes on opacity 0, so this checks the EFFECTIVE
  // opacity — on the sign-in page and on another SSR'd Card page (the 404) the reset also covers.
  test('with JavaScript off, SSR-animated cards are actually painted', async ({ browser }) => {
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await noJs.newPage();
      await page.goto('/auth/signin?next=%2Fgames%2Fnew');
      const heading = page.getByRole('heading', { level: 1, name: 'Sign-in needs JavaScript' });
      await expect(heading).toBeVisible();
      expect(await effectiveOpacity(heading)).toBe(1);
      const back = page.getByRole('link', { name: 'Back to HeistMind' });
      expect(await effectiveOpacity(back)).toBe(1);

      await page.goto('/this-page-does-not-exist-u6');
      const notFound = page.getByRole('heading', { level: 1 });
      await expect(notFound).toBeVisible();
      expect(await effectiveOpacity(notFound)).toBe(1);
    } finally {
      await noJs.close();
    }
  });
});
