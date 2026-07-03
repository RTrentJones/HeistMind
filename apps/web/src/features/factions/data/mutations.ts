'use client';

// The factions data-access seam (write side). Each mutation invalidates the game's factions query.
// Status shifts go through the ENGINE use-case (persist + 'faction' feed event in one operation).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateFactionData, Faction, UpdateFactionData } from '@heist-mind/core';
import { setFactionStatus } from '@heist-mind/engine';
import { rollKeys } from '@/features/rolls/data/queries';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';
import { factionKeys } from './queries';

export function useCreateFaction(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; data: CreateFactionData }) =>
      getRepositories().factions.create(vars.userId, vars.data).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: factionKeys.byGame(gameId) }),
  });
}

export function useUpdateFaction(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: UpdateFactionData }) =>
      getRepositories().factions.update(vars.id, vars.patch).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: factionKeys.byGame(gameId) }),
  });
}

export function useDeleteFaction(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getRepositories().factions.delete(id).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: factionKeys.byGame(gameId) }),
  });
}

/** Shift a faction's status via the ENGINE (clamped −3…+3 + 'faction' feed event). */
export function useSetFactionStatus(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      faction: Faction;
      userId: string;
      status: number;
      logLabel: string;
      logNote: string;
    }) => unwrap(await setFactionStatus(getRepositories(), vars)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: factionKeys.byGame(gameId) });
      void qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
    },
  });
}
