'use client';

// The clocks data-access seam (read side).
import { queryOptions, skipToken, useQuery } from '@tanstack/react-query';
import { getRepositories } from '@/lib/auth';
import { sharedCampaignState } from '@/lib/query/policies';
import { unwrap } from '@/lib/query/result';

export const clockKeys = {
  all: ['clocks'] as const,
  byGame: (gameId: string) => ['clocks', 'game', gameId] as const,
};

export const clockQueries = {
  /** Clocks are GM-written shared state — load-on-view per `sharedCampaignState`. */
  byGame: (gameId: string | undefined) =>
    queryOptions({
      queryKey: clockKeys.byGame(gameId ?? ''),
      ...sharedCampaignState,
      queryFn: gameId ? () => getRepositories().clocks.findByGame(gameId).then(unwrap) : skipToken,
    }),
};

/** All clocks for a game (standalone + faction-linked; callers filter as needed). */
export function useClocksByGame(gameId: string | undefined) {
  return useQuery(clockQueries.byGame(gameId));
}
