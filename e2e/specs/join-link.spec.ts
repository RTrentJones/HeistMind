// F94 — the shareable invite link /join/<code>. Signed in: redeem → land on the hub, with a
// specific error for every failure (not found / revoked / expired / used up). Signed out: an
// explainer whose Discord sign-in RETURNS to /join/<code> (the intent survives OAuth). Codes are
// case-insensitive. Throwaway personas only (membership state is consumed).
import { expect, test } from '../support/fixtures';
import { getE2EEnv, hasAdminAuth, isLocalStack } from '../support/env';
import { campaignWithJoinCode, joinViaLink, openCampaignSetup } from '../support/campaign';
import { throwawayPage } from '../support/personas';
import { dataClient } from '../support/supabase-admin';

test.describe.configure({ timeout: 180_000 });

test.describe('invite link /join/<code>', () => {
  test.beforeEach(() => {
    test.skip(!isLocalStack() || !hasAdminAuth(), 'Requires the local Supabase stack.');
  });

  test('a signed-in player opens the link (any case) and lands in the campaign', async ({
    browser,
  }) => {
    const gm = await throwawayPage(browser);
    const player = await throwawayPage(browser);
    try {
      const campaign = await campaignWithJoinCode(gm.page, 'Link Job');
      // Lowercase on purpose: codes are case-insensitive end to end.
      // The success toast fires as the redirect starts — assert it before the (slower) hub load.
      await player.page.goto(`/join/${campaign.code.toLowerCase()}`);
      await expect(player.page.getByText('You joined the campaign')).toBeVisible({
        timeout: 20_000,
      });
      await joinViaLink(player.page, campaign);

      // The use is counted on the GM's invite card.
      await gm.page.reload();
      await openCampaignSetup(gm.page);
      await expect(
        gm.page.getByTestId('join-code-row').getByText('19 of 20 uses left')
      ).toBeVisible({ timeout: 15_000 });

      // Re-opening the link is idempotent (no second use consumed, still lands on the hub).
      await joinViaLink(player.page, campaign);
      await gm.page.reload();
      await openCampaignSetup(gm.page);
      await expect(
        gm.page.getByTestId('join-code-row').getByText('19 of 20 uses left')
      ).toBeVisible({ timeout: 15_000 });
    } finally {
      await player.dispose();
      await gm.dispose();
    }
  });

  test('signed out: explains the invite and the sign-in returns to /join/<code>', async ({
    browser,
  }) => {
    const gm = await throwawayPage(browser);
    const anon = await browser.newContext();
    try {
      const campaign = await campaignWithJoinCode(gm.page, 'Anon Link');
      const page = await anon.newPage();
      await page.goto(`/join/${campaign.code}`);
      await expect(
        page.getByRole('heading', { level: 1, name: /you're invited to a campaign/i })
      ).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(campaign.code, { exact: true })).toBeVisible();
      await expect(page.getByText(/by signing in, you agree/i).first()).toBeVisible();

      // Clicking sign-in heads to Supabase's OAuth authorize endpoint; capture it and bounce the
      // tab straight back to the app (stands in for the Discord round trip).
      const origin = new URL(page.url()).origin;
      let authorizeUrl = '';
      await page.route('**/auth/v1/authorize**', route => {
        authorizeUrl = route.request().url();
        return route.fulfill({ status: 302, headers: { location: `${origin}/legal` } });
      });
      await page.getByRole('button', { name: /sign in with discord to join/i }).click();
      await page.waitForURL(/\/legal$/, { timeout: 20_000 });
      const redirectTo = new URL(new URL(authorizeUrl).searchParams.get('redirect_to') ?? '');
      expect(redirectTo.pathname).toBe('/auth/callback');
      expect(redirectTo.searchParams.get('next')).toBe(`/join/${campaign.code}`);
      // …and the same intent is remembered (same tab) for the callback's fallback.
      expect(await page.evaluate(() => sessionStorage.getItem('heistmind.auth.next'))).toBe(
        `/join/${campaign.code}`
      );
    } finally {
      await anon.close();
      await gm.dispose();
    }
  });

  test('each failure says why: not found, revoked, used up, expired', async ({ browser }) => {
    const gm = await throwawayPage(browser);
    const player = await throwawayPage(browser);
    try {
      const campaign = await campaignWithJoinCode(gm.page, 'Bad Links');
      const reason = player.page.getByTestId('join-error');

      // Not found (well-formed but unknown) — and a malformed one never hits the RPC.
      await player.page.goto('/join/ZZZZ2345');
      await expect(reason).toHaveAttribute('data-reason', 'notFound', { timeout: 20_000 });
      await expect(reason).toContainText(/doesn't exist/i);
      await player.page.goto('/join/%20%21%21');
      await expect(player.page.getByTestId('join-invalid')).toBeVisible({ timeout: 20_000 });

      // Revoked — through the GM's real two-click revoke on the hub.
      const row = gm.page.getByTestId('join-code-row');
      await row.getByRole('button', { name: /revoke join code/i }).click();
      await row.getByRole('button', { name: 'Confirm revoke' }).click();
      await expect(row).toHaveCount(0, { timeout: 10_000 });
      await player.page.goto(`/join/${campaign.code}`);
      await expect(reason).toHaveAttribute('data-reason', 'revoked', { timeout: 20_000 });
      await expect(reason).toContainText(/turned this join code off/i);

      // Used up + expired: shape fresh codes server-side (the states a GM can't click into).
      const db = dataClient(getE2EEnv());
      const { data: gmRow } = await db
        .from('games')
        .select('created_by')
        .eq('id', campaign.gameId)
        .single();
      const usedUp = `U${Date.now().toString(36).toUpperCase().slice(-7)}`;
      const expired = `X${Date.now().toString(36).toUpperCase().slice(-7)}`;
      const ins = await db.from('invitations').insert([
        {
          game_id: campaign.gameId,
          invited_by: gmRow!.created_by,
          invite_code: usedUp,
          max_uses: 1,
          used_count: 1,
        },
        {
          game_id: campaign.gameId,
          invited_by: gmRow!.created_by,
          invite_code: expired,
          max_uses: 5,
          expires_at: new Date(Date.now() - 60_000).toISOString(),
        },
      ]);
      expect(ins.error).toBeNull();
      await player.page.goto(`/join/${usedUp}`);
      await expect(reason).toHaveAttribute('data-reason', 'usedUp', { timeout: 20_000 });
      await player.page.goto(`/join/${expired.toLowerCase()}`);
      await expect(reason).toHaveAttribute('data-reason', 'expired', { timeout: 20_000 });

      // None of it made the player a member.
      await player.page.goto('/games');
      await expect(player.page.getByRole('heading', { name: campaign.name })).toHaveCount(0);
    } finally {
      await player.dispose();
      await gm.dispose();
    }
  });

  test('the /games join box takes a pasted invite link too', async ({ browser }) => {
    const gm = await throwawayPage(browser);
    const player = await throwawayPage(browser);
    try {
      const campaign = await campaignWithJoinCode(gm.page, 'Pasted Link');
      await player.page.goto('/games');
      await player.page
        .getByLabel('Join code')
        .fill(`${new URL(player.page.url()).origin}/join/${campaign.code.toLowerCase()}`);
      await player.page.getByRole('button', { name: 'Join', exact: true }).click();
      await player.page.waitForURL(new RegExp(`/games/${campaign.gameId}$`), { timeout: 20_000 });
    } finally {
      await player.dispose();
      await gm.dispose();
    }
  });

  // Round 4 P1-N1 — the campaign used to cap silently at 5 players + the GM: the 6th join got
  // "Something went wrong joining. Try again" while the invite promised 20. Now the GM sees and
  // sets the PLAYER limit, a full campaign says so specifically (link + /games box), and raising
  // the limit lets the same code in.
  test('a full campaign says so; the GM raises the player limit and the code works', async ({
    browser,
  }) => {
    const gm = await throwawayPage(browser);
    const first = await throwawayPage(browser);
    const second = await throwawayPage(browser);
    try {
      const campaign = await campaignWithJoinCode(gm.page, 'Full Table');
      // A new campaign seats 20 players (never fewer than one code's 20 uses).
      await expect(gm.page.getByTestId('player-seats')).toHaveText('0 of 20 players');
      await expect(gm.page.getByTestId('invite-seats')).toContainText('0 of 20 player seats taken');

      // The GM limits the table to one player.
      const limit = gm.page.getByRole('spinbutton', { name: 'Player limit' });
      await limit.fill('1');
      await gm.page.getByRole('button', { name: 'Save limit' }).click();
      await expect(gm.page.getByTestId('player-seats')).toHaveText('0 of 1 players', {
        timeout: 15_000,
      });

      await joinViaLink(first.page, campaign);

      // The next player is told the campaign is full — on the link…
      const reason = second.page.getByTestId('join-error');
      await second.page.goto(`/join/${campaign.code}`);
      await expect(reason).toHaveAttribute('data-reason', 'full', { timeout: 20_000 });
      await expect(reason).toContainText(/campaign is full/i);
      // …and in the /games join box.
      await second.page.goto('/games');
      await second.page.getByLabel('Join code').fill(campaign.code);
      await second.page.getByRole('button', { name: 'Join', exact: true }).click();
      await expect(second.page.getByText(/This campaign is full/)).toBeVisible({ timeout: 20_000 });

      // The GM sees it too, and can't go below the players already in. Round 5 P2-4: "full" is
      // on the setup summary (visible while folded) and the panel opens by itself.
      await gm.page.reload();
      await expect(gm.page.getByTestId('campaign-full')).toContainText('Full — 1 of 1 players', {
        timeout: 15_000,
      });
      await expect(gm.page.getByTestId('campaign-setup')).toHaveAttribute('open', '');
      await openCampaignSetup(gm.page);
      await expect(gm.page.getByTestId('player-seats')).toHaveText(
        '1 of 1 players — the campaign is full',
        { timeout: 15_000 }
      );
      await expect(gm.page.getByTestId('invite-seats')).toContainText(
        /All 1 player seats are taken/
      );
      await limit.fill('0');
      await expect(gm.page.getByRole('button', { name: 'Save limit' })).toBeDisabled();
      await limit.fill('6');
      await gm.page.getByRole('button', { name: 'Save limit' }).click();
      await expect(gm.page.getByTestId('player-seats')).toHaveText('1 of 6 players', {
        timeout: 15_000,
      });

      // The waiting player retries from the same link and gets in.
      await joinViaLink(second.page, campaign);
    } finally {
      await second.dispose();
      await first.dispose();
      await gm.dispose();
    }
  });
});
