'use client';

// The clocks data-access seam (write side). Each mutation invalidates the game's clocks query, so
// every clocks view refetches the just-changed slice (replacing the old imperative `load()`).
// Ticks go through the ENGINE use-case, which logs a 'clock' feed event when a tick FILLS the
// clock (milestones reach the table; routine ticks stay panel-only).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Clock, CreateClockData } from '@heist-mind/core';
import { tickClock } from '@heist-mind/engine';
import { rollKeys } from '@/features/rolls/data/queries';
import { getRepositories } from '@/lib/auth';
import { removeFromList, replaceInList } from '@/lib/query/cache';
import { unwrap } from '@/lib/query/result';
import { clockKeys } from './queries';

export function useCreateClock(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; data: CreateClockData }) =>
      getRepositories().clocks.create(vars.userId, vars.data).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: clockKeys.byGame(gameId) }),
  });
}

export function useDeleteClock(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getRepositories().clocks.delete(id).then(unwrap),
    onSuccess: async (_d, id) => {
      removeFromList<Clock>(qc, clockKeys.byGame(gameId), id);
      await qc.invalidateQueries({ queryKey: clockKeys.byGame(gameId) });
    },
  });
}

/** Tick a clock via the ENGINE (clamped; a completing tick logs a 'clock' feed event). */
export function useTickClock(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      clock: Clock;
      userId: string;
      delta: number;
      logLabel: string;
      logNote: string;
    }) => {
      // Tick from the FRESHEST cached fill (the row the last tick wrote back), not the render's.
      const cached = qc
        .getQueryData<Clock[]>(clockKeys.byGame(gameId))
        ?.find(c => c.id === vars.clock.id);
      return unwrap(await tickClock(getRepositories(), { ...vars, clock: cached ?? vars.clock }));
    },
    // Write the returned row into the cache FIRST, then await the confirming refetch: the +/−
    // buttons stay disabled (isPending) until both land, so the next tick computes from the
    // fresh fill instead of the pre-write value (review item 3: double-clicks swallowed ticks).
    onSuccess: async outcome => {
      replaceInList(qc, clockKeys.byGame(gameId), outcome.clock);
      await Promise.all([
        qc.invalidateQueries({ queryKey: clockKeys.byGame(gameId) }),
        outcome.completed ? qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) }) : null,
      ]);
    },
  });
}
