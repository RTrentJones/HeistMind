// UX round 3 (F101) — "Bring to a campaign" across copies of the same built-in ruleset (00025).
// A player builds a character from the catalog BEFORE joining anything, so it runs on the player's
// OWN copy of Brackwater; the GM's campaign runs on the GM's copy (a different row, identical
// content). The standalone sheet must offer that campaign, and attaching rebinds the character to
// the campaign's ruleset. Also pins the join-error status: a bad code is an HTTP 4xx, not a 500.
import { expect, test } from '../support/fixtures';
import { hasAdminAuth, isLocalStack } from '../support/env';
import { campaignWithJoinCode, joinViaLink } from '../support/campaign';
import { buildStandaloneBrackwater } from '../support/characters';
import { throwawayPage } from '../support/personas';
import { uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 240_000 });

test.describe('attach across ruleset copies', () => {
  test.beforeEach(() => {
    test.skip(!isLocalStack() || !hasAdminAuth(), 'Requires the local Supabase stack.');
  });

  test('a catalog-built character joins a campaign on the GM’s copy of the same built-in', async ({
    browser,
  }) => {
    const gm = await throwawayPage(browser);
    const player = await throwawayPage(browser);
    try {
      const campaign = await campaignWithJoinCode(gm.page, 'Copy Job');

      // The player's character, on the player's own Brackwater copy (inline catalog → wizard).
      const charName = uniqueName('Catalog Knife');
      await buildStandaloneBrackwater(player.page, charName);
      const sheetUrl = player.page.url();

      // Not a member yet → a truthful empty state with real links (no dead end).
      await expect(player.page.getByTestId('attach-none')).toBeVisible({ timeout: 15_000 });
      await expect(
        player.page.getByTestId('attach-none').getByRole('link', { name: /join one with a code/i })
      ).toHaveAttribute('href', '/games#join');
      await expect(
        player.page.getByTestId('attach-none').getByRole('link', { name: /start a campaign/i })
      ).toHaveAttribute('href', /\/games\/new\?ruleset=/);

      // Join, and get the "you're in" moment on the hub.
      await joinViaLink(player.page, campaign);
      await expect(player.page.getByTestId('joined-banner')).toBeVisible();

      // Back on the standalone sheet the GM's campaign is now offered; attaching moves it in.
      await player.page.goto(sheetUrl);
      await expect(player.page.getByRole('heading', { name: 'Bring to a campaign' })).toBeVisible({
        timeout: 15_000,
      });
      await player.page.getByLabel('Campaign').selectOption({ label: campaign.name });
      await player.page.getByRole('button', { name: 'Attach' }).click();
      await player.page.waitForURL(new RegExp(`/games/${campaign.gameId}/characters/[0-9a-f-]+$`), {
        timeout: 20_000,
      });

      // The GM sees it on the roster (it is bound to the campaign's ruleset now).
      await gm.page.goto(campaign.hubUrl);
      await expect(gm.page.getByRole('heading', { name: charName, exact: true })).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await player.dispose();
      await gm.dispose();
    }
  });

  test('a bad join code is a clean 4xx with the specific message', async ({ playerPage }) => {
    const redeem = playerPage.waitForResponse(r => r.url().includes('/rpc/redeem_invite_code'), {
      timeout: 30_000,
    });
    await playerPage.goto('/join/ZZZZ9999');
    const res = await redeem;
    expect(res.status()).toBe(400);
    await expect(playerPage.getByTestId('join-error')).toHaveAttribute('data-reason', 'notFound');
  });

  test('a malformed invite link says so before sign-in', async ({ page }) => {
    await page.goto('/join/not-a-real-code!!');
    await expect(page.getByTestId('join-invalid')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("You're invited")).toHaveCount(0);
  });
});
