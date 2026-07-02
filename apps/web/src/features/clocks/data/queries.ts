'use client';

// The clocks data-access seam (read side).
import { queryOptions, skipToken, useQuery } from '@tanstack/react-query';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';

export const clockKeys = {
  all: ['clocks'] as const,
  byGame: (gameId: string) => ['clocks', 'game', gameId] as const,
};

export const clockQueries = {
  byGame: (gameId: string | undefined) =>
    queryOptions({
      queryKey: clockKeys.byGame(gameId ?? ''),
      queryFn: gameId ? () => getRepositories().clocks.findByGame(gameId).then(unwrap) : skipToken,
    }),
};

/** All clocks for a game (standalone + faction-linked; callers filter as needed). */
export function useClocksByGame(gameId: string | undefined) {
  return useQuery(clockQueries.byGame(gameId));
}
