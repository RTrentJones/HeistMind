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
    onSuccess: () => qc.invalidateQueries({ queryKey: clockKeys.byGame(gameId) }),
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
    }) => unwrap(await tickClock(getRepositories(), vars)),
    onSuccess: outcome => {
      void qc.invalidateQueries({ queryKey: clockKeys.byGame(gameId) });
      if (outcome.completed) {
        void qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
      }
    },
  });
}
