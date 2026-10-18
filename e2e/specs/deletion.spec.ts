// F94 — deletes, with throwaway personas: a character (owner, two-click, from the list and the
// sheet), a campaign (GM; attached characters are NOT destroyed — they return to their owners as
// standalone, renamed on a name clash, and still open), a ruleset (blocked with a clear message
// while a campaign or your own character uses it; other players keep their own copy), and a GM
// ACCOUNT whose players built characters (the cascade used to be blocked by the ruleset FK).
import { expect, test } from '../support/fixtures';
import { getE2EEnv, hasAdminAuth, isLocalStack } from '../support/env';
import { campaignWithJoinCode, joinViaLink } from '../support/campaign';
import {
  buildCampaignBrackwater,
  buildStandaloneBrackwater,
  characterCard,
} from '../support/characters';
import { throwawayPage } from '../support/personas';
import { uniqueName, uploadRuleset } from '../support/rulesets';
import { mintAccessToken, userExists } from '../support/supabase-admin';

test.describe.configure({ timeout: 300_000 });

test.describe('deletes', () => {
  test.beforeEach(() => {
    test.skip(!isLocalStack() || !hasAdminAuth(), 'Requires the local Supabase stack.');
  });

  test('an owner deletes characters from My Characters and from the sheet', async ({ browser }) => {
    const me = await throwawayPage(browser);
    try {
      const { page } = me;
      const first = uniqueName('Doomed One');
      const second = uniqueName('Doomed Two');
      await buildStandaloneBrackwater(page, first);
      await buildStandaloneBrackwater(page, second);

      // From the list: first click arms, second deletes.
      await page.goto('/characters');
      await page.getByRole('button', { name: `Delete ${first}` }).click();
      await page.getByRole('button', { name: `Confirm: delete ${first} for good` }).click();
      await expect(page.getByText(`Deleted “${first}”`)).toBeVisible();
      await expect(page.getByRole('heading', { name: first, exact: true })).toHaveCount(0);

      // From the sheet's bottom card.
      await characterCard(page, second).getByRole('link', { name: 'Open' }).click();
      await page.waitForURL(/\/characters\/[0-9a-f-]+$/);
      const sheetUrl = page.url();
      await page.getByRole('button', { name: 'Delete character' }).click();
      await page.getByRole('button', { name: `Delete “${second}” for good` }).click();
      await page.waitForURL(/\/characters$/, { timeout: 15_000 });
      await expect(page.getByRole('heading', { name: second, exact: true })).toHaveCount(0);
      await page.goto(sheetUrl);
      await expect(page.getByRole('heading', { level: 1, name: second })).toHaveCount(0, {
        timeout: 15_000,
      });
    } finally {
      await me.dispose();
    }
  });

  test('a GM deletes a campaign: characters return to their owners (even on a name clash)', async ({
    browser,
  }) => {
    const gm = await throwawayPage(browser);
    const player = await throwawayPage(browser);
    try {
      const campaign = await campaignWithJoinCode(gm.page, 'Doomed Campaign');
      await joinViaLink(player.page, campaign);
      const shared = uniqueName('Same Name');
      // The player already has a standalone character with the SAME name as the one they bring
      // to the campaign — the detach must not trip the standalone-name unique index.
      await buildStandaloneBrackwater(player.page, shared);
      await buildCampaignBrackwater(player.page, campaign.hubUrl, shared);
      const gmChar = uniqueName('GM Pawn');
      await buildCampaignBrackwater(gm.page, campaign.hubUrl, gmChar);

      await gm.page.goto(campaign.hubUrl);
      await expect(gm.page.getByText(/characters in this campaign are not deleted/i)).toBeVisible();
      await gm.page.getByRole('button', { name: 'Delete campaign' }).click();
      await gm.page.getByRole('button', { name: `Delete “${campaign.name}” for good` }).click();
      await gm.page.waitForURL(/\/games$/, { timeout: 15_000 });
      await expect(gm.page.getByRole('heading', { name: campaign.name })).toHaveCount(0);

      // The GM's own character survives as standalone.
      await gm.page.goto('/characters');
      await expect(gm.page.getByRole('heading', { name: gmChar, exact: true })).toBeVisible({
        timeout: 15_000,
      });

      // The player's campaign character is back, renamed "(2)" beside the original, and opens
      // (the player got their own copy of the GM's ruleset).
      await player.page.goto('/characters');
      await expect(player.page.getByRole('heading', { name: shared, exact: true })).toBeVisible({
        timeout: 15_000,
      });
      const renamed = `${shared} (2)`;
      await expect(player.page.getByRole('heading', { name: renamed, exact: true })).toBeVisible();
      await characterCard(player.page, renamed).getByRole('link', { name: 'Open' }).click();
      await player.page.waitForURL(/\/characters\/[0-9a-f-]+$/);
      await expect(player.page.getByRole('heading', { level: 1, name: renamed })).toBeVisible({
        timeout: 15_000,
      });

      // The hub is gone for everyone.
      await player.page.goto(campaign.hubUrl);
      await expect(player.page.getByText('Campaign not found')).toBeVisible({ timeout: 15_000 });
    } finally {
      await player.dispose();
      await gm.dispose();
    }
  });

  test('ruleset delete: blocked while in use (clear message), then allowed', async ({
    browser,
  }) => {
    const gm = await throwawayPage(browser);
    try {
      const { page } = gm;
      // An unused uploaded ruleset deletes straight away.
      const spare = await uploadRuleset(page, 'veil.json', uniqueName('Spare Veil'));
      await page.getByRole('button', { name: `Delete ruleset ${spare.name}` }).click();
      await page.getByRole('button', { name: `Confirm: delete ruleset ${spare.name}` }).click();
      await expect(page.getByText(`Deleted “${spare.name}”`)).toBeVisible();
      await expect(page.getByRole('heading', { name: spare.name, exact: true })).toHaveCount(0);

      // Brackwater, used by a campaign → refused with the plain-language reason.
      const campaign = await campaignWithJoinCode(page, 'Ruleset Holder');
      await page.goto('/rulesets');
      await page.getByRole('button', { name: 'Delete ruleset Brackwater' }).click();
      await page.getByRole('button', { name: 'Confirm: delete ruleset Brackwater' }).click();
      await expect(page.getByText(/still built on this ruleset/i)).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Brackwater', exact: true }).last()
      ).toBeVisible();

      // Remove the campaign → nothing uses it → the delete goes through.
      await page.goto(campaign.hubUrl);
      await page.getByRole('button', { name: 'Delete campaign' }).click();
      await page.getByRole('button', { name: `Delete “${campaign.name}” for good` }).click();
      await page.waitForURL(/\/games$/, { timeout: 15_000 });
      await page.goto('/rulesets');
      await page.getByRole('button', { name: 'Delete ruleset Brackwater' }).click();
      await page.getByRole('button', { name: 'Confirm: delete ruleset Brackwater' }).click();
      await expect(page.getByText('Deleted “Brackwater”')).toBeVisible();
    } finally {
      await gm.dispose();
    }
  });

  test("a GM's account deletion hands their players' characters back", async ({
    browser,
    request,
  }) => {
    const env = getE2EEnv();
    const gm = await throwawayPage(browser);
    const player = await throwawayPage(browser);
    try {
      const campaign = await campaignWithJoinCode(gm.page, 'Vanishing GM');
      await joinViaLink(player.page, campaign);
      const charName = uniqueName('Orphan');
      await buildCampaignBrackwater(player.page, campaign.hubUrl, charName);

      const res = await request.post('/api/account/delete', {
        headers: { Authorization: `Bearer ${await mintAccessToken(env, gm.user)}` },
      });
      expect(res.status()).toBe(204);
      expect(await userExists(env, gm.user.id)).toBe(false);

      await player.page.goto('/characters');
      const card = characterCard(player.page, charName);
      await expect(card.getByText('Standalone', { exact: true })).toBeVisible({ timeout: 15_000 });
      await card.getByRole('link', { name: 'Open' }).click();
      await expect(player.page.getByRole('heading', { level: 1, name: charName })).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await player.dispose();
      await gm.dispose();
    }
  });
});
