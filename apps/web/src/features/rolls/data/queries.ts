'use client';

// The rolls (campaign log) data-access seam (read side).
import { queryOptions, skipToken, useQuery } from '@tanstack/react-query';
import type { Roll } from '@heist-mind/core';
import { getRepositories } from '@/lib/auth';
import { sharedCampaignState } from '@/lib/query/policies';
import { unwrap } from '@/lib/query/result';

/** How many feed entries a campaign log loads per page-view (bounded, newest first). */
export const DEFAULT_ROLL_FEED_LIMIT = 25;

export const rollKeys = {
  all: ['rolls'] as const,
  /** Prefix matching every limit-variant of a game's log — use for invalidation. */
  gamePrefix: (gameId: string) => ['rolls', 'game', gameId] as const,
  byGame: (gameId: string, limit: number) => ['rolls', 'game', gameId, limit] as const,
};

/**
 * Query options for a game's rolls — shared by the hook and `useQueries` fan-outs (e.g.
 * dashboard). The feed is THE shared play-by-post surface (every player writes it) —
 * load-on-view per `sharedCampaignState`.
 */
export function rollsByGameOptions(gameId: string | undefined, limit = DEFAULT_ROLL_FEED_LIMIT) {
  return queryOptions({
    queryKey: rollKeys.byGame(gameId ?? '', limit),
    ...sharedCampaignState,
    queryFn: gameId
      ? (): Promise<Roll[]> => getRepositories().rolls.findByGame(gameId, limit).then(unwrap)
      : skipToken,
  });
}

/** The reverse-chron campaign log for a game (most recent `limit`). */
export function useRollsByGame(gameId: string | undefined, limit = DEFAULT_ROLL_FEED_LIMIT) {
  return useQuery(rollsByGameOptions(gameId, limit));
}
