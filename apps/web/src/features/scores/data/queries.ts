'use client';

// The scores (operations) data-access seam (read side). The score list feeds the ScorePanel
// (active + recent) and the RollLog (scoreId → name, for grouping the feed by operation).
import { queryOptions, skipToken, useQuery } from '@tanstack/react-query';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';

export const scoreKeys = {
  all: ['scores'] as const,
  byGame: (gameId: string) => ['scores', 'game', gameId] as const,
};

export const scoreQueries = {
  byGame: (gameId: string | undefined) =>
    queryOptions({
      queryKey: scoreKeys.byGame(gameId ?? ''),
      queryFn: gameId ? () => getRepositories().scores.findByGame(gameId).then(unwrap) : skipToken,
    }),
};

/** Every score for a game (active + completed), newest-tracked-first per the repository order. */
export function useScoresByGame(gameId: string | undefined) {
  return useQuery(scoreQueries.byGame(gameId));
}
