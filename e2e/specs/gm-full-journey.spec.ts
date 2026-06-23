// Full GM journey, end-to-end and UI-driven: upload a ruleset → create a campaign →
// create a character through the ruleset-driven wizard → modify it. The point of this
// suite is to prove the wizard renders CONDITIONALLY off the uploaded ruleset's data:
//
//   - cinders.json (full)   → custom step labels, a point-buy budget badge, ability tier
//                             badges, and a custom `crew-ties` step that falls through to
//                             the generic options-driven ChoiceStep.
//   - veil.json (minimal)   → no custom steps (DEFAULT_STEPS), no budget badge, no tier
//                             badges — the same wizard, different data, different render.
//   - malformed.json        → rejected at upload with an inline validation error.
//
// Auth is the injected GM session (see e2e/support); a missing session skips, not fails.

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, fixturePath, uniqueName, uploadRuleset } from '../support/rulesets';

// These journeys traverse many routes (upload → list → new-game → detail → wizard → sheet);
// against the dev server each first hit cold-compiles, so the default 30s can be tight.
test.describe.configure({ timeout: 90_000 });

test.describe('GM full journey: upload → campaign → character → modify', () => {
  // Mutates the per-env (development) schema, which only exists/works against the local
  // Supabase stack (migrations + grants + RLS fix). Skip against deployed verify targets.
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('full ruleset drives custom wizard, then character is created and modified', async ({
    gmPage,
  }) => {
    // 1. Upload the full ruleset and spin up a campaign from it.
    const ruleset = await uploadRuleset(gmPage, 'cinders.json', uniqueName('Cinders & Coin'));
    await createCampaign(gmPage, ruleset, uniqueName('The Lampblack Job'));

    // 2. Enter the character-creation wizard from the game page.
    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await expect(gmPage).toHaveURL(/\/characters\/new$/);

    // 3. The stepper reflects the ruleset's CUSTOM, reordered steps (not the defaults).
    const stepper = gmPage.getByRole('tablist', { name: 'Creation steps' });
    for (const label of [
      'Choose Crew Role',
      'Assign Action Ratings',
      'Pick Edges',
      'Crew Ties',
      'Origins & Vice',
      'Confirm Crew Member',
    ]) {
      await expect(stepper.getByText(label, { exact: true })).toBeVisible();
    }

    // 4. Name + pick a playbook (seeds the attribute allocator → attributes step is valid).
    const charName = uniqueName('Asher Vane');
    await gmPage.getByLabel('Character name').fill(charName);
    await gmPage.getByRole('button', { name: 'The Razor' }).click();

    // 5. Attributes step: the point-buy budget badge is shown (full fixture has pointBuy).
    await gmPage.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(gmPage.getByText(/\/ 7 points spent/)).toBeVisible();

    // 6. Abilities step: tier badges render (full fixture's abilities carry a `tier`).
    await gmPage.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(gmPage.getByText('Tier 2', { exact: true })).toBeVisible();
    await expect(gmPage.getByText('Tier 1', { exact: true }).first()).toBeVisible();

    // 7. The custom `crew-ties` step falls through to the generic ChoiceStep (its options).
    await gmPage.getByRole('button', { name: 'Next', exact: true }).click();
    for (const opt of ['Loyal', 'Indebted', 'Rival']) {
      await expect(gmPage.getByRole('button', { name: opt })).toBeVisible();
    }
    await gmPage.getByRole('button', { name: 'Loyal' }).click();

    // 8. Identity → review, then create.
    await gmPage.getByRole('button', { name: 'Next', exact: true }).click(); // → Origins & Vice
    await gmPage.getByRole('button', { name: 'Next', exact: true }).click(); // → Confirm Crew Member
    await expect(gmPage.getByRole('heading', { name: charName })).toBeVisible();
    await expect(gmPage.getByText('The Razor')).toBeVisible();
    await gmPage.getByRole('button', { name: 'Create character' }).click();

    // 9. Back on the game page, the character is listed.
    await expect(gmPage).toHaveURL(/\/games\/[0-9a-f-]+$/);
    await expect(gmPage.getByRole('heading', { name: charName })).toBeVisible();

    // 10. Open the sheet and MODIFY: rename + award XP, asserting each persists.
    await gmPage.getByRole('link', { name: 'View' }).first().click();
    await expect(gmPage).toHaveURL(/\/characters\/[0-9a-f-]+$/);
    await expect(gmPage.getByText('0 XP')).toBeVisible();

    const renamed = uniqueName('Asher "Cinder" Vane');
    await gmPage.getByRole('button', { name: 'Edit' }).click();
    await gmPage.getByLabel('Name', { exact: true }).fill(renamed);
    await gmPage.getByRole('button', { name: 'Save' }).click();
    await expect(gmPage.getByRole('heading', { name: renamed })).toBeVisible();

    await gmPage.getByRole('button', { name: 'Add XP' }).click();
    await expect(gmPage.getByText('1 XP')).toBeVisible();
  });

  test('minimal ruleset renders DEFAULT steps, no budget badge, no tier badges', async ({
    gmPage,
  }) => {
    const ruleset = await uploadRuleset(gmPage, 'veil.json', uniqueName('Veil & Vow'));
    await createCampaign(gmPage, ruleset, uniqueName('The Quiet Oath'));

    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await expect(gmPage).toHaveURL(/\/characters\/new$/);

    // No custom steps in the fixture → the wizard falls back to DEFAULT_STEPS.
    const stepper = gmPage.getByRole('tablist', { name: 'Creation steps' });
    for (const label of ['Playbook', 'Attributes', 'Special Abilities', 'Identity', 'Review']) {
      await expect(stepper.getByText(label, { exact: true })).toBeVisible();
    }

    // Pick a playbook so the attributes step is reachable/valid.
    await gmPage.getByRole('button', { name: 'The Seer' }).click();

    // Attributes step: NO point-buy → no budget badge.
    await gmPage.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(gmPage.getByText(/points spent/)).toHaveCount(0);

    // Abilities step: abilities have no `tier` → no tier badge.
    await gmPage.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(gmPage.getByText(/^Tier /)).toHaveCount(0);
  });

  test('malformed ruleset upload is rejected with an inline validation error', async ({
    gmPage,
  }) => {
    await gmPage.goto('/rulesets/new');
    // Exercise the <input type="file"> affordance (the valid flows use the paste path).
    await gmPage.locator('#ruleset-file').setInputFiles(fixturePath('malformed.json'));
    const upload = gmPage.getByRole('button', { name: 'Upload ruleset' });
    await expect(upload).toBeEnabled();
    await upload.click();

    await expect(gmPage.getByText("That ruleset isn't valid")).toBeVisible();
    await expect(gmPage).toHaveURL(/\/rulesets\/new$/); // no redirect → nothing created
  });
});
