'use client';

// The crew data-access seam (write side). Invalidates the game's crew query on success; the
// rule-driven progression ops go through the ENGINE (persist + campaign-log event in one
// use-case — the same implementation the Discord bot will drive) and also refresh the feed.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateCrewData, Crew, UpdateCrewData } from '@heist-mind/core';
import {
  advanceCrewTier,
  applyCrewHeat,
  incarcerateCrew,
  markCrewXp,
  takeCrewAdvance,
  type AdvanceCrewTierInput,
} from '@heist-mind/engine';
import { rollKeys } from '@/features/rolls/data/queries';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';
import { crewKeys } from './queries';

export function useCreateCrew(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; data: CreateCrewData }) =>
      getRepositories().crews.create(vars.userId, vars.data).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: crewKeys.byGame(gameId) }),
  });
}

export function useUpdateCrew(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: UpdateCrewData }) =>
      getRepositories().crews.update(vars.id, vars.patch).then(unwrap),
    // Returned row into the cache, then an awaited refetch — steppers re-enable on the fresh
    // value instead of the pre-write one (review item 3).
    onSuccess: async (crew: Crew) => {
      qc.setQueryData(crewKeys.byGame(gameId), crew);
      await qc.invalidateQueries({ queryKey: crewKeys.byGame(gameId) });
    },
  });
}

/** Shared vars for the engine-backed crew progression ops (each logs a 'crew' feed event). */
interface CrewOpVars {
  crew: Crew;
  userId: string;
  logLabel: string;
  logNote: string;
}

/** The freshest cached crew (the row the last op wrote back) — ops compute from it, not the render's. */
function useFreshCrew(gameId: string) {
  const qc = useQueryClient();
  return (crew: Crew): Crew => qc.getQueryData<Crew | null>(crewKeys.byGame(gameId)) ?? crew;
}

function useCrewFeedInvalidation(gameId: string) {
  const qc = useQueryClient();
  return async (crew: Crew) => {
    qc.setQueryData(crewKeys.byGame(gameId), crew);
    await Promise.all([
      qc.invalidateQueries({ queryKey: crewKeys.byGame(gameId) }),
      qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) }),
    ]);
  };
}

/** Add heat via the ENGINE (BitD heat→wanted cascade + feed event). */
export function useApplyCrewHeat(gameId: string) {
  const invalidate = useCrewFeedInvalidation(gameId);
  const fresh = useFreshCrew(gameId);
  return useMutation({
    mutationFn: async (vars: CrewOpVars & { amount: number }) =>
      unwrap(await applyCrewHeat(getRepositories(), { ...vars, crew: fresh(vars.crew) })),
    onSuccess: invalidate,
  });
}

/**
 * Develop the crew from a full Rep tracker via the ENGINE (RAW: weak hold → strong; strong hold →
 * pay new Tier × 8 coin for +1 Tier, hold weak) + feed event. Refusals surface as errors.
 */
export function useAdvanceCrewTier(gameId: string) {
  const invalidate = useCrewFeedInvalidation(gameId);
  const fresh = useFreshCrew(gameId);
  return useMutation({
    mutationFn: async (vars: AdvanceCrewTierInput) =>
      unwrap(await advanceCrewTier(getRepositories(), { ...vars, crew: fresh(vars.crew) })),
    onSuccess: invalidate,
  });
}

/** Apply an incarceration via the ENGINE (−1 Wanted, clear Heat + feed event). */
export function useIncarcerateCrew(gameId: string) {
  const invalidate = useCrewFeedInvalidation(gameId);
  const fresh = useFreshCrew(gameId);
  return useMutation({
    mutationFn: async (vars: CrewOpVars) =>
      unwrap(await incarcerateCrew(getRepositories(), { ...vars, crew: fresh(vars.crew) })),
    onSuccess: invalidate,
  });
}

/** Set the crew's advancement-XP track via the ENGINE (+ feed event — the marks are table state). */
export function useMarkCrewXp(gameId: string) {
  const invalidate = useCrewFeedInvalidation(gameId);
  return useMutation({
    mutationFn: async (vars: CrewOpVars & { xp: number }) =>
      unwrap(await markCrewXp(getRepositories(), vars)),
    onSuccess: invalidate,
  });
}

/** Spend a FULL crew advancement track via the ENGINE (reset + feed event; refuses a non-full track). */
export function useTakeCrewAdvance(gameId: string) {
  const invalidate = useCrewFeedInvalidation(gameId);
  return useMutation({
    mutationFn: async (vars: CrewOpVars) => unwrap(await takeCrewAdvance(getRepositories(), vars)),
    onSuccess: invalidate,
  });
}
