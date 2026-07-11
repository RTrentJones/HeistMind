// F78 — the deploy gate's WRITE-PATH smoke. Every gm-* journey gates on isLocalStack(), so a
// deployed beta was verified read-only: an RLS/schema/trigger regression on the write path could
// ship green. This spec gates on what the write path ACTUALLY needs — an injected admin session
// (the gate provides SUPABASE_SERVICE_ROLE_KEY on non-Production deploys) and the per-env schema
// being exposed on the target's Supabase — so it runs locally today and lights up on beta the
// moment the schema exposure lands there, self-skipping (loudly) until then.

import { getE2EEnv, hasAdminAuth } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 120_000 });

const SCHEMA = process.env.NEXT_PUBLIC_HEISTMIND_SCHEMA || 'development';

/** Whether the target's Supabase exposes the per-env schema over PostgREST (the write surface). */
async function envSchemaExposed(): Promise<boolean> {
  const env = getE2EEnv();
  if (!env.supabaseUrl || !env.supabaseAnonKey) return false;
  try {
    const res = await fetch(`${env.supabaseUrl}/rest/v1/rulesets?select=id&limit=1`, {
      headers: {
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${env.supabaseAnonKey}`,
        'Accept-Profile': SCHEMA,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

test.describe('Deployed write-path smoke', () => {
  test.beforeEach(async () => {
    test.skip(!hasAdminAuth(), 'No admin auth (service-role key) — public-surface run.');
    test.skip(
      !(await envSchemaExposed()),
      `The '${SCHEMA}' schema isn't exposed on this target's Supabase yet — write smoke pending that migration.`
    );
  });

  test('a GM write lands: builtin ruleset → campaign, both readable back', async ({ gmPage }) => {
    // Thinnest real write chain: add the bundled starter (a repository INSERT through RLS),
    // then create a campaign from it (game + membership trigger) and read both back.
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' }).last()).toBeVisible({
      timeout: 30_000,
    });

    const ruleset = { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
    const campaignName = uniqueName('Write Smoke');
    await createCampaign(gmPage, ruleset, campaignName);

    // Reload — the state must come back from the database, not client cache.
    await gmPage.goto('/games');
    await expect(gmPage.getByRole('heading', { name: campaignName })).toBeVisible({
      timeout: 15_000,
    });
  });
});
