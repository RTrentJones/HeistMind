'use client';

// The scores (operations) data-access seam (read side). The score list feeds the ScorePanel
// (active + recent) and the RollLog (scoreId → name, for grouping the feed by operation).
import { useQuery } from '@tanstack/react-query';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';

export const scoreKeys = {
  all: ['scores'] as const,
  byGame: (gameId: string) => ['scores', 'game', gameId] as const,
};

/** Every score for a game (active + completed), newest-tracked-first per the repository order. */
export function useScoresByGame(gameId: string | undefined) {
  return useQuery({
    queryKey: scoreKeys.byGame(gameId ?? ''),
    enabled: !!gameId,
    queryFn: () => getRepositories().scores.findByGame(gameId!).then(unwrap),
  });
}
