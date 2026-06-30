'use client';

// The factions data-access seam (read side).
import { useQuery } from '@tanstack/react-query';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';

export const factionKeys = {
  all: ['factions'] as const,
  byGame: (gameId: string) => ['factions', 'game', gameId] as const,
};

/** All factions for a game (with their status/tier). */
export function useFactionsByGame(gameId: string | undefined) {
  return useQuery({
    queryKey: factionKeys.byGame(gameId ?? ''),
    enabled: !!gameId,
    queryFn: () => getRepositories().factions.findByGame(gameId!).then(unwrap),
  });
}
