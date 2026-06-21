// Authenticated session — the payoff of admin session injection. The gmPage fixture starts
// with a real Supabase session in localStorage (no Discord, no login form), so this validates
// that the app rehydrates that session into authenticated UI, and that sign-out tears it down.
//
// Skips automatically when no service-role key is configured (fixture guard).

import { test, expect } from '../support/fixtures';

test.describe('authenticated session (injected)', () => {
  test('rehydrates an injected session into the signed-in header', async ({ gmPage, gmUser }) => {
    await gmPage.goto('/');

    // The header swaps to the welcome + sign-out affordance once the session is detected.
    await expect(gmPage.getByRole('button', { name: /sign out/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      gmPage.getByText(new RegExp(`welcome, (${gmUser.username}|${gmUser.email})`, 'i'))
    ).toBeVisible();
    await expect(gmPage.getByRole('button', { name: /^sign in$/i })).toHaveCount(0);
  });

  test('sign-out returns to the signed-out state', async ({ gmPage }) => {
    await gmPage.goto('/');
    await gmPage.getByRole('button', { name: /sign out/i }).click();

    await expect(gmPage.getByRole('button', { name: /sign up with discord/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(gmPage.getByRole('button', { name: /sign out/i })).toHaveCount(0);
  });

  test('session survives a full page reload', async ({ gmPage }) => {
    await gmPage.goto('/');
    await expect(gmPage.getByRole('button', { name: /sign out/i })).toBeVisible({
      timeout: 15_000,
    });

    await gmPage.reload();
    await expect(gmPage.getByRole('button', { name: /sign out/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
