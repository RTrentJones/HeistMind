'use client';

// The games data-access seam (read side).
import { useQuery } from '@tanstack/react-query';
import type { Game } from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';

export const gameKeys = {
  all: ['games'] as const,
  byCreator: (userId: string) => ['games', 'creator', userId] as const,
  byPlayer: (userId: string) => ['games', 'player', userId] as const,
  detail: (gameId: string) => ['games', 'detail', gameId] as const,
};

/** Campaigns the user created (GM). */
export function useGamesByCreator(userId: string | undefined) {
  return useQuery({
    queryKey: gameKeys.byCreator(userId ?? ''),
    enabled: !!userId,
    queryFn: () => getRepositories().games.findByCreator(userId!).then(unwrap),
  });
}

/** Campaigns the user is an active member of (includes ones they GM). */
export function useGamesByPlayer(userId: string | undefined) {
  return useQuery({
    queryKey: gameKeys.byPlayer(userId ?? ''),
    enabled: !!userId,
    queryFn: () => getRepositories().games.findByPlayer(userId!).then(unwrap),
  });
}

/** A campaign + its ruleset/crew/etc. */
export function useGameDetail(gameId: string | undefined) {
  return useQuery({
    queryKey: gameKeys.detail(gameId ?? ''),
    enabled: !!gameId,
    queryFn: () => getRepositories().games.findWithDetails(gameId!).then(unwrap),
  });
}

/** Convenience: the user's campaigns unioned with a GM/player role (the dashboard + My-Characters shape). */
export type GameWithRole = { game: Game; role: 'gm' | 'player' };

export function rolesFor(
  userId: string,
  created: Game[] | undefined,
  joined: Game[] | undefined
): GameWithRole[] {
  const byId = new Map<string, GameWithRole>();
  for (const g of created ?? []) byId.set(g.id, { game: g, role: 'gm' });
  for (const g of joined ?? []) {
    if (!byId.has(g.id))
      byId.set(g.id, { game: g, role: g.createdBy === userId ? 'gm' : 'player' });
  }
  return [...byId.values()];
}
