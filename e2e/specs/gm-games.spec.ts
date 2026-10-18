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
    // uploadRuleset asserts the redirect + listing; confirm the "Create campaign" CTA is offered
    // (F94 terminology: campaign, never "game").
    await expect(gmPage.getByRole('link', { name: 'Create campaign' }).first()).toBeVisible();
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
    // Let the write round-trip (mutation → invalidate → refetch) BEFORE reloading — a reload
    // racing the mutation reads back 'draft' and flakes (first full-CI run caught this).
    await expect(state).toHaveValue('active', { timeout: 15_000 });
    await gmPage.reload();
    await expect(gmPage.getByLabel('Campaign state')).toHaveValue('active', { timeout: 15_000 });
  });

  test('GM generates a join code and copies its invite link (F94)', async ({ gmPage }) => {
    await gmPage.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    const ruleset = await uploadRuleset(gmPage, 'cinders.json', uniqueName('Cinders & Coin'));
    await createCampaign(gmPage, ruleset, uniqueName('Invite Link Job'));
    await gmPage.getByRole('button', { name: 'Create a join code' }).click();
    const row = gmPage.getByTestId('join-code-row');
    await expect(row).toHaveCount(1, { timeout: 10_000 });
    const code = (await row.locator('code').innerText()).trim();
    await expect(row.getByText('20 of 20 uses left')).toBeVisible();

    await row.getByRole('button', { name: 'Copy invite link' }).click();
    await expect(row.getByRole('button', { name: 'Copied!' })).toBeVisible();
    const copied = await gmPage.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(`${new URL(gmPage.url()).origin}/join/${code}`);

    await row.getByRole('button', { name: 'Copy code' }).click();
    expect(await gmPage.evaluate(() => navigator.clipboard.readText())).toBe(code);
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
