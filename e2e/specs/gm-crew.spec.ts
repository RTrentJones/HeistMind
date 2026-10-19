// Phase 8 — the crew sheet (campaign). The GM starts the crew (picks a type), tracks heat, takes a
// crew ability, and stakes a claim — all DB-backed shared state that persists across reload. Uses
// the Brackwater starter (it ships crew types / abilities / claims).

import { isLocalStack } from '../support/env';
import { test, expect } from '../support/fixtures';
import { createCampaign, uniqueName } from '../support/rulesets';

test.describe.configure({ timeout: 120_000 });

/** React's invalid-nesting warning (dev) + hydration mismatches (dev wording and prod codes). */
const NESTING_OR_HYDRATION =
  /cannot be a descendant of|cannot contain a nested|hydrat|did not match|Minified React error #(418|419|422|423|425)/i;

test.describe('GM: crew sheet', () => {
  test.beforeEach(() => {
    test.skip(
      !isLocalStack(),
      'Requires the local Supabase stack (per-env schema + migrations not yet on this deploy).'
    );
  });

  test('GM creates the crew, tracks heat, takes an ability and a claim; persists', async ({
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
    const gameUrl = await createCampaign(gmPage, ruleset, uniqueName('The Crew Job'));

    // The campaign page has a Crew section; as the GM, start the sheet by picking a type.
    await expect(gmPage.getByRole('heading', { name: 'Crew', exact: true })).toBeVisible();
    await gmPage.getByLabel('Crew type').selectOption('shadows');
    await gmPage.getByRole('button', { name: 'Create crew' }).click();

    // The sheet renders with FitD stats; Heat starts at 0.
    await expect(gmPage.getByTestId('crew-heat')).toHaveText('0', { timeout: 10_000 });
    await gmPage.getByRole('button', { name: 'Increase Heat' }).click();
    await expect(gmPage.getByTestId('crew-heat')).toHaveText('1');

    // RAW (round-3 #1): a new crew takes ONE starting ability in the advance picker — abilities
    // are never ticked freely. Take Deadly, then stake a claim.
    const picker = gmPage.getByTestId('crew-advance-picker');
    await expect(picker.getByText("Choose the crew's starting special ability")).toBeVisible();
    await expect(gmPage.getByRole('checkbox', { name: /Deadly/ })).toHaveCount(0);

    // F99 — the hub with the picker on it loads + hydrates with no React nesting / hydration
    // error (the picker's Badge was a <div> inside a <p>: "cannot be a descendant of <p> … will
    // cause a hydration error"). Reload so the full page boots with the picker present.
    const problems: string[] = [];
    gmPage.on('console', msg => {
      if (msg.type() === 'error' && NESTING_OR_HYDRATION.test(msg.text()))
        problems.push(msg.text());
    });
    gmPage.on('pageerror', err => {
      if (NESTING_OR_HYDRATION.test(err.message)) problems.push(err.message);
    });
    await gmPage.reload();
    await expect(picker.getByText("Choose the crew's starting special ability")).toBeVisible({
      timeout: 15_000,
    });
    await gmPage.waitForLoadState('networkidle');
    expect(problems).toEqual([]);
    // Own-list abilities lead, under their own heading; Veteran routes follow.
    await expect(picker.getByTestId('crew-advance-own')).toBeVisible();
    await picker.getByRole('radio', { name: /Deadly/ }).check();
    await picker.getByRole('button', { name: 'Take starting ability' }).click();
    const abilities = gmPage.getByTestId('crew-abilities');
    await expect(abilities.getByText('Deadly', { exact: true })).toBeVisible({ timeout: 10_000 });
    // The starting pick is spent — no free second pick until the XP track fills.
    await expect(picker).toHaveCount(0);
    await gmPage.getByLabel('Add claim').selectOption('Lair');
    await gmPage.getByRole('button', { name: 'Add claim' }).click();
    // The claim renders as a removable badge (unambiguous vs. the stale <option> of the same text).
    await expect(gmPage.getByRole('button', { name: 'Remove claim Lair' })).toBeVisible({
      timeout: 10_000,
    });

    // All of it persists (DB-backed shared state).
    await gmPage.goto(gameUrl);
    await expect(gmPage.getByTestId('crew-heat')).toHaveText('1', { timeout: 15_000 });
    await expect(
      gmPage.getByTestId('crew-abilities').getByText('Deadly', { exact: true })
    ).toBeVisible();
    await expect(gmPage.getByRole('button', { name: 'Remove claim Lair' })).toBeVisible();
  });

  // XP round — crew advancement: mark XP on the clickable track (same boxes as a character
  // sheet); a full track is SPENT in the advance picker on a new ability (RAW, round-3 #1), which
  // clears the track in the same write — and both the mark and the advance reach the campaign log.
  test('GM marks crew XP to full, spends the advance on a new ability, and both reach the log', async ({
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
    await createCampaign(gmPage, ruleset, uniqueName('The Advance Job'));

    await gmPage.getByLabel('Crew type').selectOption('shadows');
    await gmPage.getByRole('button', { name: 'Create crew' }).click();

    // Mark the crew track straight to full by clicking its 8th box.
    const track = gmPage.getByTestId('crew-xp-track');
    await expect(track).toBeVisible({ timeout: 10_000 });
    await track.getByRole('button', { name: 'Mark 8 crew XP' }).click();
    await expect(track.getByText('Full — ready to advance')).toBeVisible({ timeout: 10_000 });
    // The mark is table state — it lands in the shared campaign log.
    await expect(gmPage.getByText('Crew XP 8/8').first()).toBeVisible({ timeout: 10_000 });

    // Take the starting ability first (free), then spend the full track on a second one.
    const picker = gmPage.getByTestId('crew-advance-picker');
    await picker.getByRole('radio', { name: /No Traces/ }).check();
    await picker.getByRole('button', { name: 'Take starting ability' }).click();
    await expect(gmPage.getByText('Starting crew ability: No Traces').first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(track.getByText('8/8')).toBeVisible(); // the free pick leaves the track alone
    await picker.getByRole('radio', { name: /The Network/ }).check();
    await picker.getByRole('button', { name: 'Take advance' }).click();
    await expect(track.getByText('0/8')).toBeVisible({ timeout: 10_000 });
    await expect(
      gmPage.getByText('Crew advance — new special ability: The Network').first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
