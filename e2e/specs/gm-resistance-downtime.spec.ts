// Phase A2/A3 — the stress half of the FitD loop: a resistance roll costs stress and lands in the
// shared roll log, and indulge-vice downtime clears it. Mirrors the manual play-by-post flow.
// Uses the cinders fixture (action ratings → the RollPanel's resistance mode) and the live
// Condition-card stress tracker, exactly like gm-harm-stress.

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName, uploadRuleset } from '../support/rulesets';

test.describe.configure({ timeout: 120_000 });

test.describe('GM: resistance + downtime', () => {
  // Mutates the per-env schema — local Supabase stack only (matches the journey specs).
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('indulge vice clears stress; a resistance roll lands in the feed', async ({ gmPage }) => {
    const ruleset = await uploadRuleset(gmPage, 'cinders.json', uniqueName('Cinders & Coin'));
    await createCampaign(gmPage, ruleset, uniqueName('Resist Test'));

    // Minimal character (cinders/The Razor — 6 steps, 5 Nexts).
    await gmPage.getByRole('link', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/characters\/new$/);
    await gmPage.getByLabel('Character name').fill(uniqueName('Resolve'));
    await gmPage.getByRole('button', { name: 'The Razor' }).click();
    for (let i = 0; i < 5; i++)
      await gmPage.getByRole('button', { name: 'Next', exact: true }).click();
    await gmPage.getByRole('button', { name: 'Create character' }).click();
    await gmPage.waitForURL(/\/games\/[0-9a-f-]+$/);
    await gmPage.getByRole('link', { name: 'View' }).first().click();
    await gmPage.waitForURL(/\/characters\/[0-9a-f-]+$/);

    // --- Raise stress to a KNOWN 3/9 on the live Condition tracker. Every stress assertion
    // below anchors on this — no tracker read-backs (they raced the post-mutation refetch). ---
    await expect(gmPage.getByRole('heading', { name: 'Condition' })).toBeVisible();
    await expect(gmPage.getByText('0/9')).toBeVisible();
    await gmPage.getByRole('button', { name: 'Set stress to 3' }).click(); // pip a11y names — F84
    await expect(gmPage.getByText('3/9')).toBeVisible({ timeout: 10_000 });

    // --- Flashback (F16): retro-establish a beat for a priced stress cost; the feed carries it
    // and the tracker shows the deterministic charge (3 + 2 = 5). ---
    await gmPage
      .getByLabel('Flashback', { exact: true })
      .fill('Bribed the harbormaster to look away last night');
    await gmPage.getByLabel('Flashback stress cost').selectOption('2');
    await gmPage.getByRole('button', { name: 'Flash back' }).click();
    await expect(
      gmPage.getByText(/Flashback \(2 stress\): Bribed the harbormaster/).first()
    ).toBeVisible({ timeout: 15_000 });
    await expect(gmPage.getByText('5/9').first()).toBeVisible({ timeout: 10_000 });

    // --- Downtime: indulge vice clears a rolled amount (the button is disabled at 0 stress;
    // we're at 5). Two-click confirm (F60): the first click arms, the relabeled button commits. ---
    await gmPage.getByRole('button', { name: 'Indulge vice (clear stress)' }).click();
    await gmPage.getByRole('button', { name: 'Roll it? Click again to indulge' }).click();
    // BitD vice roll clears a *rolled* amount (the lowest-attribute roll's highest die), so assert
    // the downtime entry lands in the feed rather than a fixed value.
    await expect(gmPage.getByText(/Indulged vice — cleared/).first()).toBeVisible({
      timeout: 15_000,
    });

    // --- Resistance: roll against an attribute → an entry lands in the shared roll log, annotated
    // with the stress it cost. Resistance rolls the ATTRIBUTE (F23), so pin the ZERO-DICE path
    // (2d take-LOWEST, F64) by resisting with Edge — 0-rated on a fresh Razor (Grit seeds 2).
    // The faces are random but the log prints them, so assert the DISPLAYED stress is consistent
    // with the faces — the audit-P2 regression: before rolls persisted `zero_dice`, the feed
    // recomputed from 6−HIGHEST and disagreed with the sheet. ---
    await gmPage.getByLabel('Roll type').selectOption('resistance');
    await gmPage.getByLabel('Resisted attribute').selectOption('Edge');
    await gmPage.getByRole('button', { name: 'Resist', exact: true }).click();
    const resistLine = gmPage.getByText(/resisted — \d stress/).first();
    await expect(resistLine).toBeVisible({ timeout: 15_000 });
    const lineText = (await resistLine.textContent()) ?? '';
    const facesMatch = lineText.match(/\[(\d), (\d)\]/);
    expect(facesMatch, `log line should print two faces: ${lineText}`).not.toBeNull();
    // Zero-dice takes the LOWEST and never crits — two 6s resist for 0 (F64).
    const lowest = Math.min(Number(facesMatch![1]), Number(facesMatch![2]));
    expect(lineText).toContain(`resisted — ${6 - lowest} stress`);
  });
});
