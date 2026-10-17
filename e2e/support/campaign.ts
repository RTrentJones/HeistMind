// F94 helpers: a GM campaign on the bundled Brackwater starter with a join code, read back from
// the hub's invite card (the real UI path — no seeded invitation rows).
import { expect, type Page } from '@playwright/test';
import { addBrackwater } from './characters';
import { createCampaign, uniqueName } from './rulesets';

export interface Campaign {
  name: string;
  hubUrl: string;
  gameId: string;
  code: string;
}

export async function campaignWithJoinCode(page: Page, prefix = 'Crew'): Promise<Campaign> {
  const ruleset = await addBrackwater(page);
  const name = uniqueName(prefix);
  const hubUrl = await createCampaign(page, ruleset, name);
  await page.getByRole('button', { name: 'Create a join code' }).click();
  const row = page.getByTestId('join-code-row');
  await expect(row).toHaveCount(1, { timeout: 10_000 });
  const code = (await row.locator('code').innerText()).trim();
  return { name, hubUrl, gameId: hubUrl.split('/games/')[1] ?? '', code };
}

/** Open an invite link as a signed-in user and land on the campaign hub. */
export async function joinViaLink(page: Page, campaign: Campaign, code = campaign.code) {
  await page.goto(`/join/${code}`);
  await page.waitForURL(new RegExp(`/games/${campaign.gameId}$`), { timeout: 20_000 });
  await expect(page.getByRole('heading', { level: 1, name: campaign.name })).toBeVisible({
    timeout: 15_000,
  });
}
