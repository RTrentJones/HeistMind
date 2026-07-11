import type { Locator, Page } from '@playwright/test';

/**
 * True when the page is the prod coming-soon holding page (the `main`-only gate). Public specs use
 * this to assert the holding page on gated prod and exercise the real app everywhere else. The CI
 * e2e job runs un-gated (`NEXT_PUBLIC_COMING_SOON=off`), so this is only ever true when the suite
 * runs against a gated deployment (greenlight-verify against prod).
 *
 * The `/` route renders client-side after mount, so a bare `isVisible()` would race hydration.
 * Pass the locator that appears in the UN-gated state (e.g. the marketing hero heading) and this
 * resolves as soon as EITHER it or the holding-page heading appears — fast in both modes, and
 * tolerant of a cold `next dev` first-hit compile in CI.
 */
export async function onComingSoon(page: Page, ungatedMarker: Locator): Promise<boolean> {
  const gate = page.getByRole('heading', { level: 1, name: /coming soon/i });
  await Promise.race([
    gate.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => undefined),
    ungatedMarker.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => undefined),
  ]);
  return gate.isVisible().catch(() => false);
}
