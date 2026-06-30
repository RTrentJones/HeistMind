'use client';

// The clocks data-access seam (write side). Each mutation invalidates the game's clocks query, so
// every clocks view refetches the just-changed slice (replacing the old imperative `load()`).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateClockData, UpdateClockData } from '@heist-mind/database';
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

export function useUpdateClock(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: UpdateClockData }) =>
      getRepositories().clocks.update(vars.id, vars.patch).then(unwrap),
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
