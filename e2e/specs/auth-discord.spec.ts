// Discord OAuth — wiring assertion only.
//
// We deliberately do NOT drive Discord's live consent screen (third-party UI, bot detection,
// MFA — not reliably scriptable). Instead we assert the app hands off correctly: clicking
// sign-in must navigate to Supabase's GoTrue /auth/v1/authorize endpoint with provider=discord
// and a redirect_to pointing back at our callback. That covers the part WE own; the live
// round-trip stays a documented manual check (see e2e/README.md).

import { test, expect } from '../support/fixtures';
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
});
