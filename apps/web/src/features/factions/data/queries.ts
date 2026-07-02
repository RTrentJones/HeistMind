'use client';

// The factions data-access seam (read side).
import { queryOptions, skipToken, useQuery } from '@tanstack/react-query';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';

export const factionKeys = {
  all: ['factions'] as const,
  byGame: (gameId: string) => ['factions', 'game', gameId] as const,
};

export const factionQueries = {
  byGame: (gameId: string | undefined) =>
    queryOptions({
      queryKey: factionKeys.byGame(gameId ?? ''),
      queryFn: gameId
        ? () => getRepositories().factions.findByGame(gameId).then(unwrap)
        : skipToken,
    }),
};

/** All factions for a game (with their status/tier). */
export function useFactionsByGame(gameId: string | undefined) {
  return useQuery(factionQueries.byGame(gameId));
}
