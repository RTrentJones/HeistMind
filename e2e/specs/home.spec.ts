// Public surface — no backend or auth required. This is the floor of the deploy gate:
// if these fail, the deployed artifact is broken for an anonymous visitor.

import { test, expect } from '../support/fixtures';

test.describe('home page (anonymous)', () => {
  test('renders the hero without an error screen', async ({ page }) => {
    await page.goto('/');

    // The visible hero heading proves the public surface rendered. Copy is the reframed two-mode
    // landing ("The mechanical home for your Forged-in-the-Dark crew").
    await expect(page.getByRole('heading', { name: /mechanical home/i })).toBeVisible();
    // Next.js error overlay / generic crash guard.
    await expect(page.getByText(/application error|something went wrong/i)).toHaveCount(0);
  });

  test('shows signed-out auth actions', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up with discord/i })).toBeVisible();
    // The authenticated affordance must NOT be present when signed out.
    await expect(page.getByRole('button', { name: /sign out/i })).toHaveCount(0);
  });
});
