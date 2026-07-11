// Account deletion — the F88 regression guard (landed on development as "F84"; renumbered in the
// FINDINGS merge — this branch already used F84 for the stress-pip a11y finding).
//
// The bug: `/settings` deletion 500'd for any user who OWNS A CAMPAIGN. GoTrue's deleteUser
// cascade (auth.users → public.profiles → <env>.games → <env>.game_players) fired the
// update_game_player_count trigger, whose unqualified `UPDATE games` ran with invoker privileges
// — and supabase_auth_admin has no USAGE on the env schema, so `games` never resolved and the
// whole deletion aborted. A BARE account always deleted fine, so campaign ownership is the
// load-bearing condition — every test here seeds a campaign first, or it proves nothing.
//
// Each test uses a UNIQUE throwaway persona (never the shared gm/player/discord ones): deletion
// is the whole point, so the account must be consumable. Born through handle_new_user (F68), and
// its GM game_players row is trigger-owned (asserted in seedCampaignOwnedBy).

import { getE2EEnv, hasAdminAuth, isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { buildStorageState } from '../support/storage-state';
import {
  deleteTestUser,
  gameExists,
  mintAccessToken,
  provisionThrowawayUser,
  seedCampaignOwnedBy,
  userExists,
} from '../support/supabase-admin';

const env = getE2EEnv();

test.describe('Account deletion (F88 — cascade through a campaign-owning account)', () => {
  // Seeds the per-env schema + needs the service-role key — local stack only, like the GM specs.
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(env),
      'Requires the local Supabase stack (per-env schema + migrations).'
    );
    test.skip(!hasAdminAuth(env), 'Requires the Supabase service-role key.');
  });

  test('the API route deletes a campaign-owning account (204) and the cascade completes', async ({
    request,
  }) => {
    const user = await provisionThrowawayUser(env);
    try {
      const seed = await seedCampaignOwnedBy(env, user.id);
      // The trigger-owned GM membership must exist — it's the cascade row that broke F88. Without
      // it this test would pass even against the bug (a bare user always deleted cleanly).
      expect(seed.gmPlayerRows).toBeGreaterThan(0);

      const token = await mintAccessToken(env, user);
      const res = await request.post('/api/account/delete', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(204);

      // A 204 only comes back if deleteUser succeeded — i.e. the cascade ran through the env
      // schema. Confirm both ends are actually gone.
      expect(await userExists(env, user.id)).toBe(false);
      expect(await gameExists(env, seed.gameId)).toBe(false);
    } finally {
      // No-op when the delete under test already removed the user; cleans up if we bailed earlier.
      await deleteTestUser(env, user.id);
    }
  });

  test('the /settings UI deletes a campaign-owning account and lands on the home page', async ({
    browser,
  }) => {
    const user = await provisionThrowawayUser(env);
    let removed = false;
    try {
      await seedCampaignOwnedBy(env, user.id);

      // Inject the persona's real session (same mechanism as the shared personas), then drive
      // the actual danger-zone flow.
      const context = await browser.newContext({
        storageState: await buildStorageState(env, user),
      });
      const page = await context.newPage();

      await page.goto('/settings');
      await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
      await page.getByLabel(/type DELETE to confirm/i).fill('DELETE');
      await page.getByRole('button', { name: 'Delete my account' }).click();

      // Success signs out and routes to the home page; the pre-fix bug stayed on /settings and
      // surfaced the inline "Account deletion failed (500)." error.
      await page.waitForURL(url => url.pathname === '/', { timeout: 20_000 });
      await expect(page.getByText(/account deletion failed/i)).toHaveCount(0);
      await context.close();

      expect(await userExists(env, user.id)).toBe(false);
      removed = true;
    } finally {
      if (!removed) await deleteTestUser(env, user.id);
    }
  });
});
