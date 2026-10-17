// Character validity enforcement — the wizard and the editor only allow legal configs.
// Drives the clearly-surfaced rules (ability choice limit + tier/prereq gating; XP-gated
// advancement; trauma bounds). The point-buy/restriction math is covered exhaustively by the
// unit tests in packages/database/src/character-rules.test.ts.

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName, uploadRuleset } from '../support/rulesets';

test.describe.configure({ timeout: 120_000 });

test.describe('GM: character validity', () => {
  // Mutates the per-env schema — local Supabase stack only (matches the journey specs).
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('wizard enforces the ability choice limit and Veteran gating', async ({ gmPage }) => {
    const ruleset = await uploadRuleset(gmPage, 'cinders.json', uniqueName('Cinders & Coin'));
    await createCampaign(gmPage, ruleset, uniqueName('Gating'));

    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/new$/);
    await gmPage.getByLabel('Character name').fill('Gate Tester');
    await gmPage.getByRole('button', { name: 'The Razor' }).click();

    // → Assign Action Ratings → Pick Edges
    await gmPage.getByRole('button', { name: 'Next', exact: true }).click();
    await gmPage.getByRole('button', { name: 'Next', exact: true }).click();

    // The Razor seeds Battle-Born → 1 of 2 chosen (abilityChoices: 2).
    await expect(gmPage.getByText('1 of 2 chosen')).toBeVisible();

    // Ghost Step / Sharpshot aren't in the Razor's roster — reveal the other roles' abilities.
    await gmPage.getByRole('button', { name: /Show \d+ more abilities/ }).click();

    // F92 (RAW): ANY other playbook's ability needs a free Veteran slot — tier is irrelevant, so
    // tier-2 Ghost Step and tier-1 Sharpshot are both locked for the Razor (cinders has no Veteran).
    for (const other of [/Ghost Step/, /Sharpshot/]) {
      await expect(gmPage.getByRole('button', { name: other })).toHaveAttribute(
        'aria-disabled',
        'true'
      );
    }
    await expect(gmPage.getByText('Needs a free Veteran slot').first()).toBeVisible();

    // Pick the second roster ability → at the limit.
    await gmPage.getByRole('button', { name: /Menace/ }).click();
    await expect(gmPage.getByText('2 of 2 chosen')).toBeVisible();
  });

  test('editor gates advancement on XP and persists trauma', async ({ gmPage }) => {
    const ruleset = await uploadRuleset(gmPage, 'cinders.json', uniqueName('Cinders & Coin'));
    await createCampaign(gmPage, ruleset, uniqueName('Editor'));

    // Create a character (minimal happy path).
    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/new$/);
    const charName = uniqueName('Editrix');
    await gmPage.getByLabel('Character name').fill(charName);
    await gmPage.getByRole('button', { name: 'The Razor' }).click();
    // playbook → … → review (6 steps: 5 Nexts).
    for (let i = 0; i < 5; i++)
      await gmPage.getByRole('button', { name: 'Next', exact: true }).click();
    await gmPage.getByRole('button', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+$/);

    // Open the character sheet → editor.
    await gmPage.getByRole('heading', { name: charName }).waitFor();
    await gmPage.getByRole('link', { name: 'View' }).first().click();
    await gmPage.waitForURL(/\/characters\/[0-9a-f-]+$/);
    await expect(gmPage.getByText('0 XP', { exact: true })).toBeVisible();

    await gmPage.getByRole('button', { name: 'Edit build' }).click();

    // --- Advancement: unaffordable at 0 XP, allowed after awarding enough. ---
    await gmPage.getByRole('button', { name: 'Advancement' }).click();
    const buy = gmPage.getByRole('button', { name: 'Buy (2 XP)' }).first();
    await expect(buy).toBeDisabled();

    // Award 2 XP via the sheet (Add XP is +1).
    await gmPage.getByRole('button', { name: 'Add XP' }).click();
    await gmPage.getByRole('button', { name: 'Add XP' }).click();
    await expect(gmPage.getByText('2 XP available')).toBeVisible();

    // F92: only LEGAL advances are offered — the Razor's own roster (Menace); the other
    // playbooks' abilities wait behind a Veteran slot the cinders ruleset doesn't have.
    await expect(gmPage.getByTestId('veteran-locked-count')).toBeVisible();
    await expect(gmPage.getByRole('button', { name: 'Buy (2 XP)' })).toHaveCount(1);

    // Buy it → XP spent, ability learned.
    await gmPage.getByRole('button', { name: 'Buy (2 XP)' }).first().click();
    await expect(gmPage.getByText('0 XP available')).toBeVisible();
    // Shown on the sheet's ability list by name (not id).
    await expect(gmPage.getByText('Menace', { exact: true }).first()).toBeVisible();

    // --- Stress: trauma is bounded and persists. ---
    await gmPage.getByRole('button', { name: 'Stress & Trauma' }).click();
    await gmPage.getByLabel('Add trauma').fill('Haunted');
    await gmPage.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(gmPage.getByText('Trauma (1/4)')).toBeVisible();
    await gmPage.getByRole('button', { name: /Save stress/ }).click();
    await expect(gmPage.getByText('Haunted')).toBeVisible();
  });
});
