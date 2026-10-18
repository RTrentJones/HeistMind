// Crew progression use-cases: the rule-driven crew mutations (heat cascade, tier advance,
// incarceration, advancement XP) each persist the computed state AND log a 'crew' event to the
// campaign feed — previously the web computed these inline and the change never reached the
// shared log.
import {
  applyHeat,
  advanceTier,
  crewHalvesTierCost,
  incarcerate,
  planCrewAdvance,
  withCrewXp,
  type Crew,
  type CrewAdvanceChoice,
  type CrewAdvancePlan,
  type Result,
  type RulesetContent,
} from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';

interface CrewLogInput {
  /** The client's loaded crew (the write targets its id; the rules run on its current values). */
  crew: Crew;
  userId: string;
  /** Log-event copy — the client's localized strings (the engine never owns copy). */
  logLabel: string;
  logNote: string;
}

async function updateAndLog(
  repos: DatabaseRepositories,
  input: CrewLogInput,
  patch: Partial<
    Pick<
      Crew,
      'heat' | 'wanted' | 'tier' | 'rep' | 'hold' | 'coin' | 'vault' | 'resources' | 'crewAbilities'
    >
  >
): Promise<Result<Crew>> {
  const updated = await repos.crews.update(input.crew.id, patch);
  if (!updated.success) return updated;
  const logged = await repos.rolls.create(input.userId, {
    gameId: input.crew.gameId,
    kind: 'crew',
    label: input.logLabel,
    dice: 0,
    results: [],
    note: input.logNote,
  });
  if (!logged.success) return logged as Result<never>;
  return updated;
}

export interface ApplyCrewHeatInput extends CrewLogInput {
  /** Heat to add (a score's fallout). The heat→wanted cascade runs in the rules. */
  amount: number;
}

/**
 * Change heat and log it. A positive amount adds heat (BitD: a full track marks a Wanted level); a
 * negative amount reduces it (downtime "reduce heat", a cover operation…) — never below 0, and
 * Wanted is untouched.
 */
export function applyCrewHeat(
  repos: DatabaseRepositories,
  input: ApplyCrewHeatInput
): Promise<Result<Crew>> {
  const next = applyHeat({ heat: input.crew.heat, wanted: input.crew.wanted }, input.amount);
  return updateAndLog(repos, input, next);
}

export interface AdvanceCrewTierInput extends Omit<CrewLogInput, 'logNote'> {
  /** The campaign's ruleset content — read for Tier-cost effects (BitD crew "Patron" halves it). */
  content?: Pick<RulesetContent, 'crew'> | null;
  /** Log-note copy, told what happened (a hold development, or a paid Tier raise and its cost). */
  logNote: (outcome: { kind: 'hold' | 'tier'; tier: number; cost: number }) => string;
}

/**
 * Develop the crew from a FULL rep tracker, RAW (core `advanceTier`): weak hold → strong (rep 0, no
 * coin); strong hold → pay new Tier × 8 coin (halved by Patron; treasury first, then vault) for
 * Tier +1, rep 0, hold weak. Refusals come back as failures with the core code (`REP_NOT_FULL`,
 * `TIER_MAX`, `INSUFFICIENT_COIN`) and nothing is written or logged.
 */
export function advanceCrewTier(
  repos: DatabaseRepositories,
  input: AdvanceCrewTierInput
): Promise<Result<Crew>> {
  const { crew } = input;
  const out = advanceTier({
    tier: crew.tier,
    rep: crew.rep,
    hold: crew.hold,
    coin: crew.coin,
    vault: crew.vault,
    claims: crew.claims,
    halfCost: crewHalvesTierCost(input.content, crew.crewAbilities),
  });
  if (!out.ok) {
    return Promise.resolve({
      success: false,
      error: { message: `Crew can't develop: ${out.code}`, code: out.code },
    });
  }
  const logNote = input.logNote({ kind: out.kind, tier: out.tier, cost: out.cost });
  return updateAndLog(
    repos,
    { ...input, logNote },
    { tier: out.tier, rep: out.rep, hold: out.hold, coin: out.coin, vault: out.vault }
  );
}

/** Apply an incarceration (BitD: −1 Wanted, clear Heat) and log it. */
export function incarcerateCrew(
  repos: DatabaseRepositories,
  input: CrewLogInput
): Promise<Result<Crew>> {
  const next = incarcerate({ heat: input.crew.heat, wanted: input.crew.wanted });
  return updateAndLog(repos, input, next);
}

export interface MarkCrewXpInput extends CrewLogInput {
  /** The new crew-XP value (set-to, matching the clickable track; clamped to [0, 8] in core). */
  xp: number;
}

/**
 * Set the crew's advancement-XP track (BitD crew XP) and log the change to the feed — the crew's
 * XP marks are shared table state, so every player sees why the track moved.
 */
export function markCrewXp(
  repos: DatabaseRepositories,
  input: MarkCrewXpInput
): Promise<Result<Crew>> {
  return updateAndLog(repos, input, { resources: withCrewXp(input.crew.resources, input.xp) });
}

export interface TakeCrewAdvanceInput extends Omit<CrewLogInput, 'logNote'> {
  /** The campaign's ruleset content — the crew's ability list, upgrades and Veteran rules. */
  content: Pick<RulesetContent, 'crew'> | null | undefined;
  /** What the advance (or the free crew-creation pick) spends on. */
  choice: CrewAdvanceChoice;
  /** Log-note copy, told what happened (the engine never owns copy). */
  logNote: (plan: Extract<CrewAdvancePlan, { ok: true }>) => string;
}

/**
 * Take a crew advance RAW (core `planCrewAdvance`): the free crew-creation pick while the crew has
 * no special ability yet; otherwise a FULL advancement track is cleared for a new special ability
 * from the crew's own list (another type's only through a crew Veteran slot) or for two upgrade
 * boxes (BitD Mastery unlocks at four). Refusals come back with the core code (`TRACK_NOT_FULL`,
 * `ABILITY_LOCKED`, `ABILITY_HELD`, `UPGRADE_COMPLETE`…) and nothing is written or logged. The
 * crew repository re-checks the transition server-side (`checkCrewProgression`).
 */
export function takeCrewAdvance(
  repos: DatabaseRepositories,
  input: TakeCrewAdvanceInput
): Promise<Result<Crew>> {
  const plan = planCrewAdvance(input.content, input.crew, input.choice);
  if (!plan.ok) {
    return Promise.resolve({
      success: false,
      error: { message: `Crew can't advance: ${plan.code}`, code: plan.code },
    });
  }
  return updateAndLog(
    repos,
    { ...input, logNote: input.logNote(plan) },
    { crewAbilities: plan.crewAbilities, resources: plan.resources }
  );
}
