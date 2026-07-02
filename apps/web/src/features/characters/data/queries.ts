'use client';

// The characters data-access seam. The ONLY place outside other `features/*/data/` modules that may
// touch `getRepositories()` for character reads. Components depend on these hooks, never the repo.
import { useQuery } from '@tanstack/react-query';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';

export const characterKeys = {
  all: ['characters'] as const,
  byPlayer: (userId: string) => ['characters', 'player', userId] as const,
  byGame: (gameId: string) => ['characters', 'game', gameId] as const,
  detail: (id: string) => ['characters', 'detail', id] as const,
};

/**
 * Every character the user owns (standalone + in-campaign). Single-user data whose writers (wizard
 * create, clone, attach/detach, retire, editor) are all on the seam and invalidate `characterKeys`,
 * so the default staleness is safe — no load-on-view override needed here.
 */
export function useCharactersByPlayer(userId: string | undefined) {
  return useQuery({
    queryKey: characterKeys.byPlayer(userId ?? ''),
    enabled: !!userId,
    queryFn: () => getRepositories().characters.findByPlayer(userId!).then(unwrap),
  });
}

/**
 * All characters in a campaign (the roster). SHARED campaign state: other players and the GM write
 * it from their own clients, and there is no realtime layer — in-app invalidation can never cover
 * those writes. Per the BRD's load-on-view model, treat it as never fresh: revalidate on every
 * mount so opening the hub always shows the current roster. (Cached data still renders instantly;
 * the refetch is a background revalidation, no empty flicker.)
 */
export function useCharactersByGame(gameId: string | undefined) {
  return useQuery({
    queryKey: characterKeys.byGame(gameId ?? ''),
    enabled: !!gameId,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: () => getRepositories().characters.findByGame(gameId!).then(unwrap),
  });
}

/**
 * A single character with its game (nullable) + ruleset + creator. Load-on-view for the same
 * reason as the roster: the GM (a different client) can mutate a player's character, so a cached
 * sheet may not reflect shared truth. Revalidate on every mount; the sheet's own edits still
 * refresh in place via mutation invalidation.
 */
export function useCharacterDetail(id: string | undefined) {
  return useQuery({
    queryKey: characterKeys.detail(id ?? ''),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: () => getRepositories().characters.findWithDetails(id!).then(unwrap),
  });
}
