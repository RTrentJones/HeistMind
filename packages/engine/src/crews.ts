// Crew progression use-cases: the rule-driven crew mutations (heat cascade, tier advance,
// incarceration) each persist the computed state AND log a 'crew' event to the campaign feed —
// previously the web computed these inline and the change never reached the shared log.
import { applyHeat, advanceTier, incarcerate, type Crew, type Result } from '@heist-mind/core';
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
  patch: Partial<Pick<Crew, 'heat' | 'wanted' | 'tier' | 'rep'>>
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

/** Add heat (BitD: a full track marks a Wanted level) and log the change to the feed. */
export function applyCrewHeat(
  repos: DatabaseRepositories,
  input: ApplyCrewHeatInput
): Promise<Result<Crew>> {
  const next = applyHeat({ heat: input.crew.heat, wanted: input.crew.wanted }, input.amount);
  return updateAndLog(repos, input, next);
}

/** Spend a full Rep track to advance the crew one Tier (BitD) and log it. */
export function advanceCrewTier(
  repos: DatabaseRepositories,
  input: CrewLogInput
): Promise<Result<Crew>> {
  const next = advanceTier({ tier: input.crew.tier, rep: input.crew.rep });
  return updateAndLog(repos, input, next);
}

/** Apply an incarceration (BitD: −1 Wanted, clear Heat) and log it. */
export function incarcerateCrew(
  repos: DatabaseRepositories,
  input: CrewLogInput
): Promise<Result<Crew>> {
  const next = incarcerate({ heat: input.crew.heat, wanted: input.crew.wanted });
  return updateAndLog(repos, input, next);
}
