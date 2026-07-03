'use client';

// The characters data-access seam. The ONLY place outside other `features/*/data/` modules that may
// touch `getRepositories()` for character reads. Components depend on these hooks, never the repo.
import { queryOptions, skipToken, useQuery } from '@tanstack/react-query';
import { getRepositories } from '@/lib/auth';
import { sharedCampaignState } from '@/lib/query/policies';
import { unwrap } from '@/lib/query/result';

export const characterKeys = {
  all: ['characters'] as const,
  byPlayer: (userId: string) => ['characters', 'player', userId] as const,
  byGame: (gameId: string) => ['characters', 'game', gameId] as const,
  detail: (id: string) => ['characters', 'detail', id] as const,
};

export const characterQueries = {
  /**
   * Every character the user owns (standalone + in-campaign). Single-user data whose writers
   * (wizard create, clone, attach/detach, retire, editor) are all on the seam and invalidate
   * `characterKeys`, so the default staleness is safe — no load-on-view override needed here.
   */
  byPlayer: (userId: string | undefined) =>
    queryOptions({
      queryKey: characterKeys.byPlayer(userId ?? ''),
      queryFn: userId
        ? () => getRepositories().characters.findByPlayer(userId).then(unwrap)
        : skipToken,
    }),
  /**
   * All characters in a campaign (the roster). SHARED campaign state — other players and the GM
   * write it from their own clients — so load-on-view per `sharedCampaignState` (the policy's
   * full rationale lives there).
   */
  byGame: (gameId: string | undefined) =>
    queryOptions({
      queryKey: characterKeys.byGame(gameId ?? ''),
      ...sharedCampaignState,
      queryFn: gameId
        ? () => getRepositories().characters.findByGame(gameId).then(unwrap)
        : skipToken,
    }),
  /**
   * A single character with its game (nullable) + ruleset + creator. Load-on-view for the same
   * reason as the roster: the GM (a different client) can mutate a player's character, so a
   * cached sheet may not reflect shared truth. The sheet's own edits still refresh in place via
   * mutation invalidation.
   */
  detail: (id: string | undefined) =>
    queryOptions({
      queryKey: characterKeys.detail(id ?? ''),
      ...sharedCampaignState,
      queryFn: id ? () => getRepositories().characters.findWithDetails(id).then(unwrap) : skipToken,
    }),
};

export function useCharactersByPlayer(userId: string | undefined) {
  return useQuery(characterQueries.byPlayer(userId));
}

export function useCharactersByGame(gameId: string | undefined) {
  return useQuery(characterQueries.byGame(gameId));
}

export function useCharacterDetail(id: string | undefined) {
  return useQuery(characterQueries.detail(id));
}
