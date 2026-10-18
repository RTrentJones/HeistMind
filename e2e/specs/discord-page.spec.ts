// /discord — the player-facing bot guide (F67): the page a GM sends players. Public, anonymous,
// no backend needed. On gated prod the route redirects to the coming-soon holding page (only /
// and /legal/* stay reachable), so the spec is gate-tolerant like the other public specs.

import { test, expect } from '../support/fixtures';
import { onComingSoon } from '../support/coming-soon';

test.describe('/discord — bot guide (anonymous)', () => {
  test('renders getting-started and the command reference', async ({ page }) => {
    await page.goto('/discord');
    const hero = page.getByRole('heading', { name: /heistmind on discord/i });
    test.skip(await onComingSoon(page, hero), 'prod coming-soon gate — /discord redirects home');

    await expect(hero).toBeVisible();
    await expect(page.getByRole('heading', { name: /getting started/i })).toBeVisible();

    // The command reference includes the player loop and the full GM control set (bot parity —
    // /crew xp|advance shipped with the crew-advancement round).
    await expect(page.getByRole('heading', { name: /command reference/i })).toBeVisible();
    await expect(page.getByText('/character use|show|unset')).toBeVisible();
    await expect(page.getByText('/harm take|clear')).toBeVisible();
    await expect(page.getByText('/crew xp|advance')).toBeVisible();
    // F94 — rows match the real manifest: /log is top-level, link/unlink + account are listed.
    await expect(page.getByText('/log text:', { exact: true })).toBeVisible();
    await expect(page.getByText('/heist link|unlink')).toBeVisible();
    await expect(page.getByText('/heist account')).toBeVisible();
    await expect(page.getByText(/\/heist log/)).toHaveCount(0);

    // …and the setup order is the real one: campaign + join on the web first, no "claim" step.
    const steps = page.getByTestId('discord-setup-steps');
    await expect(steps).toContainText(/create the campaign on this site/i);
    await expect(steps).toContainText(/invite link/i);
    await expect(page.getByText(/claim a character/i)).toHaveCount(0);
  });

  test('offers the bot install links when the app id is configured', async ({ page }) => {
    await page.goto('/discord');
    const hero = page.getByRole('heading', { name: /heistmind on discord/i });
    test.skip(await onComingSoon(page, hero), 'prod coming-soon gate — /discord redirects home');
    const install = page.getByRole('link', { name: /add heistmind to your discord server/i });
    test.skip((await install.count()) === 0, 'NEXT_PUBLIC_DISCORD_APP_ID not set on this deploy');
    const href = (await install.getAttribute('href')) ?? '';
    expect(href).toMatch(/^https:\/\/discord\.com\/oauth2\/authorize\?/);
    expect(href).toContain('scope=bot+applications.commands');
    expect(href).toContain('integration_type=0');
    await expect(
      page.getByRole('link', { name: /add it to your discord account/i })
    ).toHaveAttribute('href', /integration_type=1/);
  });

  test('the landing play-by-post track links the guide', async ({ page }) => {
    await page.goto('/');
    const guideLink = page.getByRole('link', { name: /how the bot works/i });
    test.skip(await onComingSoon(page, guideLink), 'prod coming-soon gate — marketing not shown');

    await guideLink.click();
    await expect(page).toHaveURL(/\/discord$/);
    await expect(page.getByRole('heading', { name: /heistmind on discord/i })).toBeVisible();
  });
});
