'use client';

// The scores data-access seam (write side). Start/end run through the ENGINE use-cases (score
// lifecycle + its campaign-log event in one sequenced operation — the same implementation the
// Discord bot will drive); the mutations invalidate the score list AND the log.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Score } from '@heist-mind/core';
import { endScore, startScore } from '@heist-mind/engine';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';
import { rollKeys } from '@/features/rolls/data/queries';
import { scoreKeys } from './queries';

export function useStartScore(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      userId: string;
      name?: string;
      logLabel: string;
      logNote: string;
    }): Promise<Score> =>
      unwrap(
        await startScore(getRepositories(), {
          gameId,
          userId: vars.userId,
          ...(vars.name !== undefined ? { name: vars.name } : {}),
          logLabel: vars.logLabel,
          logNote: vars.logNote,
        })
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scoreKeys.byGame(gameId) });
      void qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
    },
  });
}

export function useEndScore(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      userId: string;
      scoreId: string;
      logLabel: string;
      logNote: string;
    }): Promise<Score> =>
      unwrap(
        await endScore(getRepositories(), {
          gameId,
          userId: vars.userId,
          scoreId: vars.scoreId,
          logLabel: vars.logLabel,
          logNote: vars.logNote,
        })
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scoreKeys.byGame(gameId) });
      void qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
    },
  });
}
