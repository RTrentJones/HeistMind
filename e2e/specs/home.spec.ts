// Public surface — no backend or auth required. This is the floor of the deploy gate:
// if these fail, the deployed artifact is broken for an anonymous visitor.
//
// On `main` (prod) the coming-soon gate is on, so `/` is the holding page; these specs stay green
// in both states — the CI e2e job runs un-gated (NEXT_PUBLIC_COMING_SOON=off) and sees the real
// landing, while greenlight-verify against gated prod sees the holding page.

import { test, expect } from '../support/fixtures';
import { onComingSoon } from '../support/coming-soon';

test.describe('home page (anonymous)', () => {
  test('renders the public surface without an error screen', async ({ page }) => {
    await page.goto('/');
    const hero = page.getByRole('heading', { name: /mechanical home/i });

    if (await onComingSoon(page, hero)) {
      // Prod holding page: it renders and offers no way to sign in.
      await expect(page.getByRole('button', { name: /sign in|discord/i })).toHaveCount(0);
    } else {
      // The reframed two-mode landing ("The mechanical home for your Forged-in-the-Dark crew").
      await expect(hero).toBeVisible();
    }
    // Next.js error overlay / generic crash guard.
    await expect(page.getByText(/application error|something went wrong/i)).toHaveCount(0);
  });

  test('shows signed-out auth actions', async ({ page }) => {
    await page.goto('/');
    const signUp = page.getByRole('button', { name: /sign up with discord/i });
    test.skip(await onComingSoon(page, signUp), 'prod coming-soon gate — no sign-in is shown');

    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible();
    await expect(signUp).toBeVisible();
    // The authenticated affordance must NOT be present when signed out.
    await expect(page.getByRole('button', { name: /sign out/i })).toHaveCount(0);
  });

  test('footer links the legal documents and the clickwrap names the terms', async ({ page }) => {
    await page.goto('/');
    const hero = page.getByRole('heading', { name: /mechanical home/i });

    // The clickwrap only exists on the marketing landing; the holding page has no sign-in CTA.
    if (!(await onComingSoon(page, hero))) {
      await expect(page.getByText(/by signing in, you agree to the/i).first()).toBeVisible();
    }

    // Footer → terms lands on the document, not a 404 (the footer is present in both states).
    await page
      .getByRole('contentinfo')
      .getByRole('link', { name: /^terms$/i })
      .click();
    await expect(page.getByRole('heading', { level: 1, name: /terms of service/i })).toBeVisible();
  });
});
