'use client';

// The clocks data-access seam (read side).
import { useQuery } from '@tanstack/react-query';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';

export const clockKeys = {
  all: ['clocks'] as const,
  byGame: (gameId: string) => ['clocks', 'game', gameId] as const,
};

/** All clocks for a game (standalone + faction-linked; callers filter as needed). */
export function useClocksByGame(gameId: string | undefined) {
  return useQuery({
    queryKey: clockKeys.byGame(gameId ?? ''),
    enabled: !!gameId,
    queryFn: () => getRepositories().clocks.findByGame(gameId!).then(unwrap),
  });
}
