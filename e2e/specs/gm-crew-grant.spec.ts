// Crew-aware level-ups. A campaign crew's upgrade changes what its members may do: BitD's "Mastery"
// lets a crew member raise an action rating to 4 (instead of the usual cap of 3). This drives the
// end-to-end wiring — the crew sheet grants Mastery, and the character editor (which loads the crew)
// surfaces the benefit in its Advancement tab. Brackwater ships the crew ability with `actionMax: 4`.

import { isLocalStack } from '../support/env';
import { assignKnifeDots } from '../support/characters';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 180_000 });

test.describe('GM: crew grants (Mastery)', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('a crew Mastery upgrade surfaces in a member’s editor as a raised action cap', async ({
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
    const gameUrl = await createCampaign(gmPage, ruleset, uniqueName('The Mastery Job'));

    // Start the crew and take the Mastery upgrade (effects.actionMax = 4).
    await expect(gmPage.getByRole('heading', { name: 'Crew', exact: true })).toBeVisible();
    await gmPage.getByLabel('Crew type').selectOption('shadows');
    await gmPage.getByRole('button', { name: 'Create crew' }).click();
    // RAW (round-3 #1): Mastery is an UPGRADE — four upgrade boxes, two per full advance.
    const picker = gmPage.getByTestId('crew-advance-picker');
    await picker.getByRole('radio', { name: /No Traces/ }).check(); // the free starting ability
    await picker.getByRole('button', { name: 'Take starting ability' }).click();
    await expect(picker).toHaveCount(0, { timeout: 10_000 });
    const track = gmPage.getByTestId('crew-xp-track');
    for (const boxes of ['2/4', '4/4']) {
      await track.getByRole('button', { name: 'Mark 8 crew XP' }).click();
      await picker.getByRole('radio', { name: /Mark 2 upgrade boxes: Mastery/ }).check();
      await picker.getByRole('button', { name: 'Take advance' }).click();
      await expect(gmPage.getByTestId('crew-upgrade-crew-mastery')).toContainText(boxes, {
        timeout: 10_000,
      });
    }

    // Create a character in this campaign (one ability is seeded; place the 4 creation dots).
    await gmPage.goto(gameUrl);
    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/new$/);
    await gmPage.getByLabel('Character name').fill(uniqueName('Vault'));
    await gmPage.getByRole('button', { name: 'The Knife' }).click();
    const next = gmPage.getByRole('button', { name: 'Next', exact: true });
    await next.click(); // → action ratings
    await assignKnifeDots(gmPage);
    for (let i = 0; i < 6; i++) await next.click(); // abilities → identity steps → review
    await gmPage.getByRole('button', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+$/, { timeout: 15_000 });

    // Open the sheet → editor → Advancement: the crew-benefits panel announces the Mastery cap.
    await gmPage.getByRole('link', { name: 'View' }).first().click();
    await gmPage.waitForURL(/\/characters\/[0-9a-f-]+$/);
    await gmPage.getByRole('button', { name: 'Edit build' }).click();
    await gmPage.getByRole('button', { name: 'Advancement' }).click();
    await expect(gmPage.getByText(/raise an action rating to 4/)).toBeVisible({ timeout: 10_000 });
  });
});
