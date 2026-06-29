'use client';

// The rolls (campaign log) data-access seam (read side).
import { useQuery } from '@tanstack/react-query';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';

export const rollKeys = {
  all: ['rolls'] as const,
  byGame: (gameId: string, limit: number) => ['rolls', 'game', gameId, limit] as const,
};

/** The reverse-chron campaign log for a game (most recent `limit`). */
export function useRollsByGame(gameId: string | undefined, limit = 25) {
  return useQuery({
    queryKey: rollKeys.byGame(gameId ?? '', limit),
    enabled: !!gameId,
    queryFn: () => getRepositories().rolls.findByGame(gameId!, limit).then(unwrap),
  });
}
