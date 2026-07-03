'use client';

// The crew data-access seam (read side).
import { queryOptions, skipToken, useQuery } from '@tanstack/react-query';
import { getRepositories } from '@/lib/auth';
import { sharedCampaignState } from '@/lib/query/policies';
import { unwrap } from '@/lib/query/result';

export const crewKeys = {
  all: ['crews'] as const,
  byGame: (gameId: string) => ['crews', 'game', gameId] as const,
};

export const crewQueries = {
  /**
   * The one crew for a game (or null); `skipToken` parks the query until a gameId exists.
   * GM-written shared state that also raises other characters' validation caps (Mastery/Deadly/
   * Mule) — load-on-view per `sharedCampaignState`.
   */
  byGame: (gameId: string | undefined) =>
    queryOptions({
      queryKey: crewKeys.byGame(gameId ?? ''),
      ...sharedCampaignState,
      queryFn: gameId ? () => getRepositories().crews.findByGame(gameId).then(unwrap) : skipToken,
    }),
};

/** The one crew for a game (or null). */
export function useCrewByGame(gameId: string | undefined) {
  return useQuery(crewQueries.byGame(gameId));
}
