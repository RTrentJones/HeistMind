// GM journeys — discrete checks for the ruleset/campaign surface. The deep, conditional
// wizard journey (character create + modify) lives in gm-full-journey.spec.ts; these are
// the focused unit-level GM flows. The gmPage fixture provides an authenticated GM context
// (no Discord); a missing injected session skips rather than fails.

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, fixturePath, uniqueName, uploadRuleset } from '../support/rulesets';

// Upload + create-campaign cold-compile several routes on the dev server; give them headroom.
test.describe.configure({ timeout: 60_000 });

test.describe('GM: rulesets & games', () => {
  // Mutates the per-env (development) schema — only valid against the local Supabase stack.
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('GM uploads a custom FitD ruleset', async ({ gmPage }) => {
    const name = uniqueName('Veil & Vow');
    await uploadRuleset(gmPage, 'veil.json', name);
    // uploadRuleset asserts the redirect + listing; confirm the "Create game" CTA is offered.
    await expect(gmPage.getByRole('link', { name: 'Create game' }).first()).toBeVisible();
  });

  test('malformed ruleset upload is rejected with a validation error', async ({ gmPage }) => {
    await gmPage.goto('/rulesets/new');
    await gmPage.locator('#ruleset-file').setInputFiles(fixturePath('malformed.json'));
    await gmPage.getByLabel(/right to upload this content/i).check();
    const upload = gmPage.getByRole('button', { name: 'Upload ruleset' });
    await expect(upload).toBeEnabled();
    await upload.click();
    await expect(gmPage.getByText("That ruleset isn't valid")).toBeVisible();
    await expect(gmPage).toHaveURL(/\/rulesets\/new$/);
  });

  test('GM creates a game from an uploaded ruleset', async ({ gmPage }) => {
    const ruleset = await uploadRuleset(gmPage, 'cinders.json', uniqueName('Cinders & Coin'));
    await createCampaign(gmPage, ruleset, uniqueName('The Silk Blades Score'));
    // The game-detail header attributes the campaign to its ruleset.
    await expect(gmPage.getByText(ruleset.name)).toBeVisible();

    // F32 — the GM moves the campaign through its lifecycle from the hub; it persists.
    const state = gmPage.getByLabel('Campaign state');
    await expect(state).toHaveValue('draft');
    await state.selectOption('active');
    await gmPage.reload();
    await expect(gmPage.getByLabel('Campaign state')).toHaveValue('active', { timeout: 15_000 });
  });

  test.fixme('GM generates and copies a player invite', async ({ gmPage }) => {
    // Invitations are out of scope for this PR (provider.ts leaves the invitations repo
    // unimplemented). Ready to flesh out once the invite flow lands.
    expect(gmPage).toBeTruthy();
  });

  test('GM dashboard lists games the GM owns', async ({ gmPage }) => {
    const ruleset = await uploadRuleset(gmPage, 'veil.json', uniqueName('Veil & Vow'));
    const campaign = uniqueName('The Owned Campaign');
    await createCampaign(gmPage, ruleset, campaign);

    await gmPage.goto('/games');
    await expect(gmPage.getByRole('heading', { name: 'Campaigns' })).toBeVisible();
    await expect(gmPage.getByRole('heading', { name: campaign })).toBeVisible();
  });
});
