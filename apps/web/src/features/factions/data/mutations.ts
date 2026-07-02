'use client';

// The factions data-access seam (write side). Each mutation invalidates the game's factions query.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateFactionData, UpdateFactionData } from '@heist-mind/core';
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
