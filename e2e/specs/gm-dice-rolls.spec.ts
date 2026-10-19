// Phase 3 — async dice roller + campaign roll log. Roll an action on the character sheet; the roll
// is persisted and shows up in the campaign's roll log (the play-by-post feed). Uses the Brackwater
// starter (action-rating mode → the sheet shows action rolls).

import { isLocalStack } from '../support/env';
import { assignKnifeDots, buildBrackwaterCharacter, characterCard } from '../support/characters';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 120_000 });

test.describe('GM: dice rolls + roll log', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('rolls an action on the sheet and it lands in the campaign roll log', async ({ gmPage }) => {
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets|Refresh my Brackwater copy/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' }).last()).toBeVisible({
      timeout: 30_000,
    });
    const ruleset = { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
    const gameUrl = await createCampaign(gmPage, ruleset, uniqueName('Dice Test'));

    // Minimal character (Brackwater has 8 steps → 7 Nexts to review; defaults are legal).
    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/new$/);
    await gmPage.getByLabel('Character name').fill('Roller');
    await gmPage.getByRole('button', { name: 'The Knife' }).click();
    await gmPage.getByRole('button', { name: 'Next', exact: true }).click(); // → action ratings
    await assignKnifeDots(gmPage);
    for (let i = 0; i < 6; i++)
      await gmPage.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(gmPage.getByRole('heading', { name: /Confirm Crew Member/i })).toBeVisible();
    await gmPage.getByRole('button', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+$/);
    await gmPage.getByRole('link', { name: 'View' }).first().click();
    await gmPage.waitForURL(/\/characters\/[0-9a-f-]+$/);

    // Roll an action from the sheet's Dice panel.
    await expect(gmPage.getByRole('heading', { name: 'Dice' })).toBeVisible();
    await gmPage.getByRole('button', { name: 'Roll', exact: true }).click();
    // Immediate result feedback + an entry in the log (the "[n, …]" faces are unique to the log).
    // Scoped to the panel's live result region — the log's outcome badge is translated too now.
    await expect(
      gmPage.getByTestId('roll-result').getByText(/Critical!|Success|Partial|Bad outcome/)
    ).toBeVisible({
      timeout: 10_000,
    });
    await expect(gmPage.getByText(/\[\d/).first()).toBeVisible();

    // Round 4 — ability dice (the bot's `bonus:`): +2d from an ability on an action roll, and
    // −3d on a resistance (the 0d floor is unit-tested in roll-pool.test). Both persist a note.
    // Round 5 P1-2 — push + ability dice are ONE-SHOT: after the roll lands both reset, so an
    // unchanged second roll neither pushes again (another 2 stress) nor keeps the +2d.
    const abilityDice = gmPage.getByRole('combobox', { name: 'Ability dice' });
    const push = gmPage.getByRole('checkbox', { name: 'Push (+1d, 2 stress)' });
    await abilityDice.selectOption('2');
    await push.check();
    const faces = gmPage.getByTestId('roll-result').getByText(/^\[/);
    const before = await faces.textContent();
    await gmPage.getByRole('button', { name: 'Roll', exact: true }).click();
    await expect(push).not.toBeChecked({ timeout: 10_000 });
    await expect(abilityDice).toHaveValue('0');
    // The result region shows the new roll's faces (5 dice: rating + push + 2).
    await expect(faces).not.toHaveText(before ?? '', { timeout: 10_000 });
    const afterFirst = await faces.textContent();
    await gmPage.getByRole('button', { name: 'Roll', exact: true }).click();
    // Wait for the second roll to land before changing the form: its success reset clears the
    // one-shot options, and switching to a resistance roll first would let that reset wipe the
    // −3d chosen below.
    await expect(faces).not.toHaveText(afterFirst ?? '', { timeout: 10_000 });
    await expect(push).not.toBeChecked();
    await gmPage.getByRole('combobox', { name: 'Roll type' }).selectOption('resistance');
    await gmPage.getByRole('combobox', { name: 'Ability dice' }).selectOption('-3');
    await gmPage.getByRole('button', { name: 'Resist', exact: true }).click();
    await expect(gmPage.getByTestId('roll-result').getByText(/stress|Cleared/i)).toBeVisible({
      timeout: 10_000,
    });

    // The roll is on the campaign's shared, DB-backed log (and survives navigation).
    await gmPage.goto(gameUrl);
    await expect(gmPage.getByRole('heading', { name: 'Campaign log' })).toBeVisible();
    await expect(gmPage.getByText(/\[\d/).first()).toBeVisible({ timeout: 15_000 });
    await expect(gmPage.getByText('Includes +2d from an ability or upgrade.')).toBeVisible({
      timeout: 15_000,
    });
    await expect(gmPage.getByText('Includes −3d (penalty).')).toBeVisible();
    // Exactly ONE pushed roll in the log: the second, unchanged roll didn't push again.
    await expect(gmPage.getByText(/Pushed \(\+1d, 2 stress\)/)).toHaveCount(1);
  });

  // Round 5 P2-6 (F103) — an assist from ANOTHER player's character is charged (RAW: the helper
  // takes 1 stress) through 00027, and the roller is told; the log names the charge.
  test("an assist from another player's character charges their stress and says so", async ({
    gmPage,
    playerPage,
  }) => {
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets|Refresh my Brackwater copy/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' }).last()).toBeVisible({
      timeout: 30_000,
    });
    const ruleset = { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
    const gameUrl = await createCampaign(gmPage, ruleset, uniqueName('Assist Test'));

    // The GM's character is the HELPER: the player can't write it, so the charge must go
    // through the 00027 RPC (a GM roller would take the plain validated write instead).
    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/new$/);
    const helper = uniqueName('Helper');
    await buildBrackwaterCharacter(gmPage, helper);
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+$/, { timeout: 15_000 });

    // A player joins with a code and builds the roller.
    await gmPage.getByRole('button', { name: 'Create a join code' }).click();
    const codeEl = gmPage.getByTestId('join-code-row').locator('code');
    await expect(codeEl).toBeVisible({ timeout: 10_000 });
    const code = (await codeEl.innerText()).trim();
    await playerPage.goto('/games');
    await playerPage.getByLabel('Join code').fill(code);
    await playerPage.getByRole('button', { name: 'Join', exact: true }).click();
    await playerPage.waitForURL(/\/games\/[0-9a-f-]+/, { timeout: 20_000 });
    await playerPage.getByRole('link', { name: 'Create character' }).first().click();
    await playerPage.waitForURL(/\/characters\/new$/);
    const roller = uniqueName('Roller');
    await buildBrackwaterCharacter(playerPage, roller);
    await playerPage.waitForURL(/\/games\/[0-9a-f-]+$/, { timeout: 15_000 });
    await playerPage.goto('/characters');
    await characterCard(playerPage, roller).getByRole('link', { name: 'Open' }).click();
    await expect(playerPage.getByRole('heading', { level: 1, name: roller })).toBeVisible({
      timeout: 15_000,
    });

    // The player rolls with the GM's character assisting.
    const assist = playerPage.getByRole('combobox', { name: 'Assist' });
    await expect(assist).toBeVisible({ timeout: 15_000 });
    await assist.selectOption({ label: `Assist: ${helper} (+1d)` });
    // Round 6 P2-2 — the helper's cost is on the pool line (a phone's select truncated it).
    await expect(playerPage.getByTestId('roll-pool')).toContainText(`${helper} takes 1 stress`);
    await playerPage.getByRole('button', { name: 'Roll', exact: true }).click();
    await expect(playerPage.getByTestId('roll-stress-note')).toHaveText(
      `${helper} marked 1 stress for the assist — it’s on their sheet.`,
      { timeout: 15_000 }
    );
    // One-shot: the assist resets after the roll.
    await expect(assist).toHaveValue('');
    // The campaign log carries the charge, which the helper's owner sees — a line the SERVER
    // builds from the two characters' names (round 6 P1-1: no client-supplied text), and the
    // roll's own note no longer claims the stress was paid (P2-2).
    await gmPage.goto(gameUrl);
    await expect(gmPage.getByText(`${helper} marked 1 stress assisting ${roller}.`)).toBeVisible({
      timeout: 15_000,
    });
    await expect(gmPage.getByText(`Assisted by ${helper} (+1d)`)).toBeVisible();
  });

  // F43 — moderate harm surfaces its RAW −1d on the sheet's ACTION roll panel, waivable. Lives
  // here (Brackwater, action-rating mode) because the hint only exists for action rolls — a
  // point-buy ruleset's sheet panel (fortune/resistance only) has no action roll to penalize.
  test('moderate harm surfaces the −1d penalty on the action panel; clearing removes it', async ({
    gmPage,
  }) => {
    await gmPage.goto('/rulesets');
    await gmPage
      .getByRole('button', { name: /Add Brackwater to my rulesets|Refresh my Brackwater copy/i })
      .first()
      .click();
    await expect(gmPage.getByRole('heading', { name: 'Brackwater' }).last()).toBeVisible({
      timeout: 30_000,
    });
    const ruleset = { name: 'Brackwater', version: '1.0.0', optionLabel: 'Brackwater (v1.0.0)' };
    await createCampaign(gmPage, ruleset, uniqueName('Penalty Test'));

    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/new$/);
    await gmPage.getByLabel('Character name').fill(uniqueName('Limper'));
    await gmPage.getByRole('button', { name: 'The Knife' }).click();
    await gmPage.getByRole('button', { name: 'Next', exact: true }).click(); // → action ratings
    await assignKnifeDots(gmPage);
    for (let i = 0; i < 6; i++)
      await gmPage.getByRole('button', { name: 'Next', exact: true }).click();
    await gmPage.getByRole('button', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+$/, { timeout: 15_000 });
    await gmPage.getByRole('link', { name: 'View' }).first().click();
    await gmPage.waitForURL(/\/characters\/[0-9a-f-]+$/);

    // Take moderate harm on the sheet face; the ACTION panel surfaces the −1d with a waiver.
    await gmPage.getByLabel('Take harm').fill('Cracked ribs');
    await gmPage.getByRole('button', { name: '+ Moderate' }).click();
    await expect(gmPage.getByText('Moderate harm — this roll loses 1 die.')).toBeVisible({
      timeout: 15_000,
    });
    await expect(gmPage.getByRole('checkbox', { name: /waive harm penalty/i })).toBeVisible();

    // Recovery clears the wound and the penalty hint with it.
    // Two-click confirm (F91): the first click arms the box, the second clears it.
    await gmPage.getByRole('button', { name: 'Clear harm: Cracked ribs' }).click();
    await gmPage.getByRole('button', { name: 'Confirm clearing Cracked ribs' }).click();
    await expect(gmPage.getByText('Cleared harm: Cracked ribs')).toBeVisible({ timeout: 10_000 });
    await expect(gmPage.getByText('Moderate harm — this roll loses 1 die.')).toHaveCount(0, {
      timeout: 10_000,
    });
  });
});
