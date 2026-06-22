// Playwright fixtures exposing pre-authenticated browser contexts per persona.
//
// `gmPage` / `playerPage` load the storageState that global-setup injected, so a test body
// starts already logged in — no UI login, no Discord. Two independent contexts in one test
// is exactly what tenant-isolation assertions need (GM's data must be invisible to a Player).
//
// If a persona's storageState is absent (no admin credentials this run), the dependent
// fixture skips the test rather than failing — keeping the public surface green.

import { existsSync } from 'node:fs';
import { test as base, type Page } from '@playwright/test';
import { storageStatePath } from './paths';
import { TEST_USERS, type TestUser } from './supabase-admin';

interface PersonaFixtures {
  gmPage: Page;
  playerPage: Page;
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
    await use(page);
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
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
