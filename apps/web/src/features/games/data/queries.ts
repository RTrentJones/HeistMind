'use client';

// The games data-access seam (read side).
import { queryOptions, skipToken, useQuery } from '@tanstack/react-query';
import type { Game } from '@heist-mind/core';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';

export const gameKeys = {
  all: ['games'] as const,
  byCreator: (userId: string) => ['games', 'creator', userId] as const,
  byPlayer: (userId: string) => ['games', 'player', userId] as const,
  detail: (gameId: string) => ['games', 'detail', gameId] as const,
};

export const gameQueries = {
  byCreator: (userId: string | undefined) =>
    queryOptions({
      queryKey: gameKeys.byCreator(userId ?? ''),
      queryFn: userId
        ? () => getRepositories().games.findByCreator(userId).then(unwrap)
        : skipToken,
    }),
  byPlayer: (userId: string | undefined) =>
    queryOptions({
      queryKey: gameKeys.byPlayer(userId ?? ''),
      queryFn: userId ? () => getRepositories().games.findByPlayer(userId).then(unwrap) : skipToken,
    }),
  detail: (gameId: string | undefined) =>
    queryOptions({
      queryKey: gameKeys.detail(gameId ?? ''),
      queryFn: gameId
        ? () => getRepositories().games.findWithDetails(gameId).then(unwrap)
        : skipToken,
    }),
};

/** Campaigns the user created (GM). */
export function useGamesByCreator(userId: string | undefined) {
  return useQuery(gameQueries.byCreator(userId));
}

/** Campaigns the user is an active member of (includes ones they GM). */
export function useGamesByPlayer(userId: string | undefined) {
  return useQuery(gameQueries.byPlayer(userId));
}

/** A campaign + its ruleset/crew/etc. */
export function useGameDetail(gameId: string | undefined) {
  return useQuery(gameQueries.detail(gameId));
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
