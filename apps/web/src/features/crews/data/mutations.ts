'use client';

// The crew data-access seam (write side). Invalidates the game's crew query on success; the
// rule-driven progression ops go through the ENGINE (persist + campaign-log event in one
// use-case — the same implementation the Discord bot will drive) and also refresh the feed.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateCrewData, Crew, UpdateCrewData } from '@heist-mind/core';
import { advanceCrewTier, applyCrewHeat, incarcerateCrew } from '@heist-mind/engine';
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
    onSuccess: () => qc.invalidateQueries({ queryKey: crewKeys.byGame(gameId) }),
  });
}

/** Shared vars for the engine-backed crew progression ops (each logs a 'crew' feed event). */
interface CrewOpVars {
  crew: Crew;
  userId: string;
  logLabel: string;
  logNote: string;
}

function useCrewFeedInvalidation(gameId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: crewKeys.byGame(gameId) });
    void qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
  };
}

/** Add heat via the ENGINE (BitD heat→wanted cascade + feed event). */
export function useApplyCrewHeat(gameId: string) {
  const invalidate = useCrewFeedInvalidation(gameId);
  return useMutation({
    mutationFn: async (vars: CrewOpVars & { amount: number }) =>
      unwrap(await applyCrewHeat(getRepositories(), vars)),
    onSuccess: invalidate,
  });
}

/** Spend a full Rep track to advance Tier via the ENGINE (+ feed event). */
export function useAdvanceCrewTier(gameId: string) {
  const invalidate = useCrewFeedInvalidation(gameId);
  return useMutation({
    mutationFn: async (vars: CrewOpVars) => unwrap(await advanceCrewTier(getRepositories(), vars)),
    onSuccess: invalidate,
  });
}

/** Apply an incarceration via the ENGINE (−1 Wanted, clear Heat + feed event). */
export function useIncarcerateCrew(gameId: string) {
  const invalidate = useCrewFeedInvalidation(gameId);
  return useMutation({
    mutationFn: async (vars: CrewOpVars) => unwrap(await incarcerateCrew(getRepositories(), vars)),
    onSuccess: invalidate,
  });
}
