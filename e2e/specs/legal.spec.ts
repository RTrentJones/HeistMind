// Public legal surface — anonymous, no backend required (same floor as home.spec.ts):
// every /legal/* route must render its h1 without an error screen, and the licenses page
// must show the CC BY attribution (a license obligation, not just copy).

import { test, expect } from '../support/fixtures';

const ROUTES: Array<{ path: string; heading: RegExp }> = [
  { path: '/legal', heading: /^legal$/i },
  { path: '/legal/terms', heading: /terms of service/i },
  { path: '/legal/privacy', heading: /privacy policy/i },
  { path: '/legal/dmca', heading: /dmca & copyright policy/i },
  { path: '/legal/acceptable-use', heading: /acceptable use policy/i },
  { path: '/legal/licenses', heading: /content licenses & attributions/i },
];

test.describe('legal pages (anonymous)', () => {
  for (const { path, heading } of ROUTES) {
    test(`${path} renders without an error screen`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.getByText(/application error|something went wrong/i)).toHaveCount(0);
    });
  }

  test('licenses page carries the Blades in the Dark CC BY attribution', async ({ page }) => {
    await page.goto('/legal/licenses');
    await expect(
      page.getByText(/product of One Seven Design, developed and authored by John Harper/).first()
    ).toBeVisible();
  });
});
