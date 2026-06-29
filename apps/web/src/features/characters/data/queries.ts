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

/** Every character the user owns (standalone + in-campaign). */
export function useCharactersByPlayer(userId: string | undefined) {
  return useQuery({
    queryKey: characterKeys.byPlayer(userId ?? ''),
    enabled: !!userId,
    queryFn: () => getRepositories().characters.findByPlayer(userId!).then(unwrap),
  });
}

/** All characters in a campaign (the roster). */
export function useCharactersByGame(gameId: string | undefined) {
  return useQuery({
    queryKey: characterKeys.byGame(gameId ?? ''),
    enabled: !!gameId,
    queryFn: () => getRepositories().characters.findByGame(gameId!).then(unwrap),
  });
}

/** A single character with its game (nullable) + ruleset + creator. */
export function useCharacterDetail(id: string | undefined) {
  return useQuery({
    queryKey: characterKeys.detail(id ?? ''),
    enabled: !!id,
    queryFn: () => getRepositories().characters.findWithDetails(id!).then(unwrap),
  });
}
