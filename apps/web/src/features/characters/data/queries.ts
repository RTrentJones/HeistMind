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
 * Every character the user owns (standalone + in-campaign). Load-on-view for now: the creation
 * wizard (`character-creation-store`) is not yet on the write seam, so a just-created character
 * can't invalidate this list — revalidate on every mount so My Characters + the dashboard always
 * show it. Revert to the default staleTime once the wizard's write migrates (PR4b-8 close-out).
 */
export function useCharactersByPlayer(userId: string | undefined) {
  return useQuery({
    queryKey: characterKeys.byPlayer(userId ?? ''),
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: () => getRepositories().characters.findByPlayer(userId!).then(unwrap),
  });
}

/**
 * All characters in a campaign (the roster). Shared campaign state that changes from outside this
 * client — most notably the character-creation wizard, which is not yet on the write seam and so
 * can't invalidate this query. Per the BRD's load-on-view model, treat it as never fresh: revalidate
 * on every mount so returning to the hub after a create/retire always shows the current roster.
 * (Cached data still renders instantly; the refetch is a background revalidation, no empty flicker.)
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
 * A single character with its game (nullable) + ruleset + creator. Load-on-view for the same reason
 * as the roster: unmigrated writers mutate it and navigate to a possibly-cached sheet — most sharply
 * AttachToCampaign (attach/detach flips `gameId`, so a stale detail shows the wrong campaign mode),
 * plus CharacterEditor and the creation wizard. Revalidate on every mount so the sheet always
 * reflects the current character; the sheet's own edits still refresh in place via invalidation.
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
