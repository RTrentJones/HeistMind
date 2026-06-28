// Logged-in home — `/` renders the personal Dashboard once a session is present (marketing shows
// when signed out, covered by home.spec.ts). The gmPage fixture injects a real Supabase session, so
// visiting `/` should land on the dashboard chrome: the welcome heading, the quick actions, and the
// "your campaigns" / "your characters" sections (which render their headings even with no data yet).
//
// Skips automatically when no service-role key is configured (fixture guard).

import { test, expect } from '../support/fixtures';

test.describe('dashboard (authenticated /)', () => {
  test('an injected session lands on the personal dashboard', async ({ gmPage }) => {
    await gmPage.goto('/');

    // Dashboard-only welcome heading (the header shows "Welcome, X" as text, not a heading).
    await expect(gmPage.getByRole('heading', { name: /welcome back/i })).toBeVisible({
      timeout: 15_000,
    });

    // The "your stuff" sections + a primary quick action are always present.
    await expect(gmPage.getByRole('heading', { name: /your campaigns/i })).toBeVisible();
    await expect(gmPage.getByRole('heading', { name: /your characters/i })).toBeVisible();
    await expect(gmPage.getByRole('link', { name: /create campaign/i })).toBeVisible();
  });
});
