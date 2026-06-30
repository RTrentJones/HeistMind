'use client';

// The crew data-access seam (read side).
import { useQuery } from '@tanstack/react-query';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';

export const crewKeys = {
  all: ['crews'] as const,
  byGame: (gameId: string) => ['crews', 'game', gameId] as const,
};

/** The one crew for a game (or null). */
export function useCrewByGame(gameId: string | undefined) {
  return useQuery({
    queryKey: crewKeys.byGame(gameId ?? ''),
    enabled: !!gameId,
    queryFn: () => getRepositories().crews.findByGame(gameId!).then(unwrap),
  });
}
