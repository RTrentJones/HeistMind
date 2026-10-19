'use client';

// The games data-access seam (write side).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateGameData, GameState } from '@heist-mind/core';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';
import { characterKeys } from '@/features/characters/data/queries';
import { rollKeys } from '@/features/rolls/data/queries';
import { gameKeys } from './queries';

/**
 * Create a campaign. Invalidates every games query — the new campaign shows in the created/joined
 * lists and the dashboard. (A game name is unique per creator; the raw `23505` surfaces via the
 * thrown `RepositoryError` for the form to translate.)
 */
export function useCreateGame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; data: CreateGameData }) =>
      getRepositories().games.create(vars.userId, vars.data).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: gameKeys.all }),
  });
}

/**
 * Move the campaign through its lifecycle (draft → recruiting → active → paused → completed).
 * GM-only via RLS; the hub gates the control the same way (F32).
 */
export function useUpdateGameState(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; state: GameState }) =>
      getRepositories().games.updateState(gameId, vars.userId, vars.state).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: gameKeys.all }),
  });
}

/**
 * GM: delete the campaign. Its characters are NOT destroyed — they return to their owners as
 * standalone characters (00014 FK + the 00023 trigger); the campaign's crew, clocks, factions,
 * scores, join codes and log go with it.
 */
export function useDeleteGame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { gameId: string }) =>
      getRepositories().games.delete(vars.gameId).then(unwrap),
    onSuccess: async (_d, vars) => {
      qc.removeQueries({ queryKey: gameKeys.detail(vars.gameId) });
      await Promise.all([
        qc.invalidateQueries({ queryKey: gameKeys.all }),
        qc.invalidateQueries({ queryKey: characterKeys.all }),
      ]);
    },
  });
}

/**
 * GM: set the campaign's PLAYER limit (the GM's seat is on top — 00026). Refreshes the hub so the
 * seat count, the invite card and the members panel agree.
 */
export function useSetPlayerLimit(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { players: number }) =>
      getRepositories().games.setPlayerLimit(gameId, vars.players).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: gameKeys.all }),
  });
}

/** GM: remove a player (status 'removed'; their characters go back to them as standalone). */
export function useRemovePlayer(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { playerId: string; note?: string }) =>
      getRepositories().gamePlayers.removePlayer(gameId, vars.playerId, vars.note).then(unwrap),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: gameKeys.detail(gameId) }),
        qc.invalidateQueries({ queryKey: characterKeys.all }),
        qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) }),
      ]),
  });
}

/** Player: leave the campaign (their characters return to standalone). */
export function useLeaveGame(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { note?: string }) =>
      getRepositories().gamePlayers.leave(gameId, vars.note).then(unwrap),
    onSuccess: async () => {
      qc.removeQueries({ queryKey: gameKeys.detail(gameId) });
      await Promise.all([
        qc.invalidateQueries({ queryKey: gameKeys.all }),
        qc.invalidateQueries({ queryKey: characterKeys.all }),
      ]);
    },
  });
}
