'use client';

// The scores data-access seam (write side). Start/end invalidate the game's score list; the caller
// also writes a matching campaign-log event via the rolls seam (logged start/end of an operation).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateScoreData, Score } from '@heist-mind/core';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';
import { scoreKeys } from './queries';

export function useStartScore(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; data: CreateScoreData }): Promise<Score> =>
      getRepositories().scores.start(vars.userId, vars.data).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: scoreKeys.byGame(gameId) }),
  });
}

export function useEndScore(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string): Promise<Score> => getRepositories().scores.end(id).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: scoreKeys.byGame(gameId) }),
  });
}
