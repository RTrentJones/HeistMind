'use client';

// The rolls (campaign log) data-access seam (read side).
import { useQuery } from '@tanstack/react-query';
import type { Roll } from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';

export const rollKeys = {
  all: ['rolls'] as const,
  /** Prefix matching every limit-variant of a game's log — use for invalidation. */
  gamePrefix: (gameId: string) => ['rolls', 'game', gameId] as const,
  byGame: (gameId: string, limit: number) => ['rolls', 'game', gameId, limit] as const,
};

/** Query options for a game's rolls — shared by the hook and `useQueries` fan-outs (e.g. dashboard). */
export function rollsByGameOptions(gameId: string, limit = 25) {
  return {
    queryKey: rollKeys.byGame(gameId, limit),
    queryFn: (): Promise<Roll[]> => getRepositories().rolls.findByGame(gameId, limit).then(unwrap),
  };
}

/** The reverse-chron campaign log for a game (most recent `limit`). */
export function useRollsByGame(gameId: string | undefined, limit = 25) {
  return useQuery({
    ...rollsByGameOptions(gameId ?? '', limit),
    enabled: !!gameId,
  });
}
