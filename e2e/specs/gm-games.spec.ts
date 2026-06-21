// GM journeys — SCAFFOLD (test.fixme).
//
// These are marked fixme because the underlying features do not exist yet:
//   - packages/database provider.ts still returns `{} as any` for rulesets/games repos
//   - apps/web has no /games or ruleset-upload routes (only /, /auth/callback)
// As each feature lands, delete the `.fixme` and flesh out the body. The gmPage fixture
// already provides an authenticated GM context (no Discord), so these are ready to drive
// the real UI the moment it exists.

import { test, expect } from '../support/fixtures';

test.describe('GM: rulesets & games', () => {
  test.fixme('GM uploads a custom FitD ruleset', async ({ gmPage }) => {
    // await gmPage.goto('/rulesets/new');
    // upload fixture file → expect it listed.
    expect(gmPage).toBeTruthy();
  });

  test.fixme('malformed ruleset upload is rejected with a validation error', async ({ gmPage }) => {
    expect(gmPage).toBeTruthy();
  });

  test.fixme('GM creates a game from an uploaded ruleset', async ({ gmPage }) => {
    expect(gmPage).toBeTruthy();
  });

  test.fixme('GM generates and copies a player invite', async ({ gmPage }) => {
    expect(gmPage).toBeTruthy();
  });

  test.fixme('GM dashboard lists only games the GM owns', async ({ gmPage }) => {
    expect(gmPage).toBeTruthy();
  });
});
