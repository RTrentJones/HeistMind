// OAuth callback handling — exercised directly (no Discord needed) by hitting /auth/callback
// with the query params Supabase would append. Covers the loading state and the error path,
// which are pure client logic in app/auth/callback/page.tsx.

import { test, expect } from '../support/fixtures';
import { onComingSoon } from '../support/coming-soon';

test.describe('auth callback', () => {
  test('shows the completing-sign-in loading state by default', async ({ page }) => {
    await page.goto('/auth/callback');
    // On gated prod, /auth/* redirects to the holding page — the callback logic isn't reachable.
    const loading = page.getByRole('heading', { name: /completing sign in/i });
    test.skip(await onComingSoon(page, loading), 'prod coming-soon gate — /auth/* redirects home');

    await expect(loading).toBeVisible();
    await expect(page.getByText(/waiting for discord authentication/i)).toBeVisible();
  });

  test('surfaces an OAuth error and redirects home', async ({ page }) => {
    await page.goto(
      '/auth/callback?error=access_denied&error_description=' +
        encodeURIComponent('User denied the request')
    );
    const failed = page.getByRole('heading', { name: /authentication failed/i });
    test.skip(await onComingSoon(page, failed), 'prod coming-soon gate — /auth/* redirects home');

    await expect(failed).toBeVisible();
    await expect(page.getByText(/user denied the request/i)).toBeVisible();

    // The page schedules a redirect back to home with an error marker.
    await page.waitForURL(/\/\?error=auth_failed/, { timeout: 10_000 });
  });
});
