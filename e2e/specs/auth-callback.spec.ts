// OAuth callback handling — exercised directly (no Discord needed) by hitting /auth/callback
// with the query params Supabase would append. Covers the loading state, the error paths (F94:
// never the provider's attacker-controllable error_description; a cancelled consent gets
// friendly copy) and the return-to `next` intent (validated same-origin paths only).

import { test, expect } from '../support/fixtures';
import { onComingSoon } from '../support/coming-soon';

test.describe('auth callback', () => {
  test('shows the signing-in state by default, without developer jargon', async ({ page }) => {
    await page.goto('/auth/callback');
    // On gated prod, /auth/* redirects to the holding page — the callback logic isn't reachable.
    const loading = page.getByRole('heading', { name: /signing you in/i });
    test.skip(await onComingSoon(page, loading), 'prod coming-soon gate — /auth/* redirects home');

    await expect(loading).toBeVisible();
    await expect(page.getByText(/finishing your discord sign-in/i)).toBeVisible();
    await expect(page.getByText(/supabase|oauth tokens/i)).toHaveCount(0);
  });

  test('a cancelled Discord sign-in gets friendly copy, never the raw description', async ({
    page,
  }) => {
    await page.goto(
      '/auth/callback?error=access_denied&error_description=' +
        encodeURIComponent('Visit evil.example.com to fix your account')
    );
    const failed = page.getByRole('heading', { name: /sign-in didn't finish/i });
    test.skip(await onComingSoon(page, failed), 'prod coming-soon gate — /auth/* redirects home');

    await expect(failed).toBeVisible();
    await expect(page.getByText(/you cancelled the discord sign-in/i)).toBeVisible();
    await expect(page.getByText(/evil\.example\.com/)).toHaveCount(0);
    // A cancel just goes home — no failure banner.
    await page.waitForURL(url => url.pathname === '/' && !url.search, { timeout: 10_000 });
  });

  test('a provider error shows generic copy and redirects home with the retry banner', async ({
    page,
  }) => {
    await page.goto(
      '/auth/callback?error=server_error&error_description=' +
        encodeURIComponent('Injected <b>phishing</b> text')
    );
    const failed = page.getByRole('heading', { name: /sign-in didn't finish/i });
    test.skip(await onComingSoon(page, failed), 'prod coming-soon gate — /auth/* redirects home');

    await expect(failed).toBeVisible();
    await expect(page.getByText(/discord sign-in didn't complete/i)).toBeVisible();
    await expect(page.getByText(/phishing/i)).toHaveCount(0);

    // The page schedules a redirect back to home with an error marker…
    await page.waitForURL(/\/\?error=auth_failed/, { timeout: 10_000 });
    // …which home SURFACES (F40) as a dismissible banner with a retry pointer.
    await expect(page.getByText(/sign-in didn't complete/i)).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /dismiss alert/i }).click();
    await expect(page.getByText(/sign-in didn't complete/i)).toHaveCount(0);
  });
});

test.describe('auth callback — return-to intent (F94)', () => {
  test('a signed-in return honours a same-origin next path', async ({ gmPage }) => {
    await gmPage.goto('/auth/callback?next=' + encodeURIComponent('/discord'));
    await gmPage.waitForURL(/\/discord$/, { timeout: 20_000 });
    await expect(gmPage.getByRole('heading', { name: /heistmind on discord/i })).toBeVisible();
  });

  for (const evil of ['//evil.example.com/x', 'https://evil.example.com/', '/\\evil.example.com']) {
    test(`an off-site next (${evil}) is ignored — lands home`, async ({ gmPage }) => {
      await gmPage.goto('/auth/callback?next=' + encodeURIComponent(evil));
      await gmPage.waitForURL(
        url => url.origin === new URL(gmPage.url()).origin && url.pathname === '/',
        {
          timeout: 20_000,
        }
      );
      expect(new URL(gmPage.url()).hostname).not.toContain('evil');
    });
  }

  test('falls back to the intent remembered at sign-in (sessionStorage)', async ({ gmPage }) => {
    await gmPage.addInitScript(() => {
      if (location.pathname === '/auth/callback')
        sessionStorage.setItem('heistmind.auth.next', '/characters');
    });
    await gmPage.goto('/auth/callback');
    await gmPage.waitForURL(/\/characters$/, { timeout: 20_000 });
  });
});
