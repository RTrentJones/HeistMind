// Playwright fixtures exposing pre-authenticated browser contexts per persona.
//
// `gmPage` / `playerPage` load the storageState that global-setup injected, so a test body
// starts already logged in — no UI login, no Discord. Two independent contexts in one test
// is exactly what tenant-isolation assertions need (GM's data must be invisible to a Player).
//
// If a persona's storageState is absent (no admin credentials this run), the dependent
// fixture skips the test rather than failing — keeping the public surface green.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { test as base, type Page } from '@playwright/test';
import { storageStatePath } from './paths';
import { TEST_USERS, type TestUser } from './supabase-admin';

// Opt-in V8 JS-coverage collection (chromium). When E2E_COVERAGE=1 each persona page records
// coverage around the test body and dumps the raw entries to e2e/.coverage/raw/*.json, which
// `e2e/coverage-report.mjs` then remaps (via sourcemaps) into an lcov/HTML report.
const COVERAGE = process.env.E2E_COVERAGE === '1';
const RAW_DIR = join(process.cwd(), 'e2e', '.coverage', 'raw');

/** Run the test body with the page handed over, recording V8 coverage when enabled. */
async function withCoverage(page: Page, handOver: () => Promise<void>): Promise<void> {
  if (COVERAGE) await page.coverage.startJSCoverage({ resetOnNavigation: false });
  try {
    await handOver();
  } finally {
    if (COVERAGE) {
      const entries = await page.coverage.stopJSCoverage();
      // Fetch each bundle's sourcemap NOW (the dev server is still up) and attach it, so the
      // offline report can remap bundle coverage back to apps/web/src + packages/*.
      for (const entry of entries) {
        const match = /\/\/# sourceMappingURL=(\S+)/.exec(entry.source ?? '');
        if (!match || !entry.url.startsWith('http')) continue;
        try {
          const mapUrl = new URL(match[1], entry.url).href;
          const res = await page.request.get(mapUrl);
          if (res.ok()) (entry as unknown as { sourceMap: unknown }).sourceMap = await res.json();
        } catch {
          /* best-effort: an unmapped bundle just won't remap to source */
        }
      }
      mkdirSync(RAW_DIR, { recursive: true });
      writeFileSync(join(RAW_DIR, `${randomUUID()}.json`), JSON.stringify(entries));
    }
  }
}

interface PersonaFixtures {
  gmPage: Page;
  playerPage: Page;
  /** The Discord persona's browser — the SAME account the bot acts as (cross-client parity). */
  discordPage: Page;
  gmUser: TestUser;
  playerUser: TestUser;
}

export const test = base.extend<PersonaFixtures>({
  gmUser: [TEST_USERS.gm, { option: false }],
  playerUser: [TEST_USERS.player, { option: false }],

  gmPage: async ({ browser }, use, testInfo) => {
    const path = storageStatePath('gm');
    if (!existsSync(path)) {
      testInfo.skip(true, 'No injected GM session (Supabase service-role key not configured).');
      return;
    }
    const context = await browser.newContext({ storageState: storageStatePath('gm') });
    const page = await context.newPage();
    await withCoverage(page, () => use(page));
    await context.close();
  },

  playerPage: async ({ browser }, use, testInfo) => {
    const path = storageStatePath('player');
    if (!existsSync(path)) {
      testInfo.skip(true, 'No injected Player session (Supabase service-role key not configured).');
      return;
    }
    const context = await browser.newContext({ storageState: storageStatePath('player') });
    const page = await context.newPage();
    await withCoverage(page, () => use(page));
    await context.close();
  },

  discordPage: async ({ browser }, use, testInfo) => {
    const path = storageStatePath('discord');
    if (!existsSync(path)) {
      testInfo.skip(
        true,
        'No injected Discord-persona session (Supabase service-role key not configured).'
      );
      return;
    }
    const context = await browser.newContext({ storageState: storageStatePath('discord') });
    const page = await context.newPage();
    await withCoverage(page, () => use(page));
    await context.close();
  },
});

export { expect } from '@playwright/test';
