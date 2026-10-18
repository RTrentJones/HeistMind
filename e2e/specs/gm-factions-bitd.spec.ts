// F95 — factions on the Blades in the Dark built-in. BitD deliberately ships NO suggested factions
// (setting IP), and the panel used to add factions only from suggestions — so a BitD GM saw "Seed
// one of the city powers below." with nothing below and could never add one. gm-factions.spec
// only covered Brackwater (which suggests), which is how this slipped. This walks the free-text
// form on the real BitD built-in: name + tier + starting status + notes → the card, persisted.

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 120_000 });

test.describe('GM: factions on Blades in the Dark (no suggestions)', () => {
  test.beforeEach(() => {
    test.skip(!isLocalStack(), 'Requires the local Supabase stack.');
  });

  test('GM adds a custom faction with tier, status and notes; persists on reload', async ({
    gmPage,
  }) => {
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', {
        name: /Add Blades in the Dark to my rulesets|Refresh my Blades in the Dark copy/i,
      })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Blades in the Dark' }).last()).toBeVisible({
      timeout: 30_000,
    });

    // Create the campaign on the BitD copy (version-agnostic: the built-in's version moves).
    const campaign = uniqueName('The Lampblack Job');
    await gmPage.goto('/games/new');
    const rulesetSelect = gmPage.getByLabel('Ruleset', { exact: true });
    const option = rulesetSelect.locator('option', { hasText: /^Blades in the Dark \(v/ }).first();
    await rulesetSelect.selectOption({ label: (await option.textContent()) ?? '' });
    await gmPage.getByLabel('Campaign name').fill(campaign);
    await gmPage.getByRole('button', { name: 'Create campaign' }).click();
    await expect(gmPage).toHaveURL(/\/games\/[0-9a-f-]+$/, { timeout: 15_000 });
    const gameUrl = gmPage.url();

    // No suggestions on BitD — and the empty state no longer points at a picker that isn't there.
    await expect(gmPage.getByRole('heading', { name: 'Factions', exact: true })).toBeVisible();
    await expect(gmPage.getByTestId('factions-empty')).toContainText(/with the form below/i);
    await expect(gmPage.getByLabel('Suggested faction')).toHaveCount(0);

    const form = gmPage.getByRole('form', { name: 'Add a faction' });
    await form.getByLabel('Faction name').fill('The Lampblacks');
    await form.getByLabel('Tier').selectOption('2');
    await form.getByLabel('Starting status').selectOption('-2');
    await form.getByLabel('Notes (optional)').fill('Rival gang — want Crow’s Foot back.');
    await form.getByRole('button', { name: 'Add faction' }).click();

    await expect(gmPage.getByText('The Lampblacks', { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(gmPage.locator('[data-testid^="faction-tier-"]')).toHaveText('2');
    await expect(gmPage.locator('[data-testid^="faction-status-"]')).toHaveText('-2');
    await expect(gmPage.getByText('Rival gang — want Crow’s Foot back.')).toBeVisible();
    // The form cleared, and the duplicate guard refuses the same name.
    await expect(form.getByLabel('Faction name')).toHaveValue('');
    await form.getByLabel('Faction name').fill('the lampblacks');
    await expect(form.getByText(/already has a faction with that name/i)).toBeVisible();
    await expect(form.getByRole('button', { name: 'Add faction' })).toBeDisabled();

    // Shared, DB-backed state: it all survives a reload.
    await gmPage.goto(gameUrl);
    await expect(gmPage.getByText('The Lampblacks', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(gmPage.locator('[data-testid^="faction-status-"]')).toHaveText('-2');
    await expect(gmPage.getByText('Rival gang — want Crow’s Foot back.')).toBeVisible();
  });
});
