'use client';

// The crew data-access seam (write side). Invalidates the game's crew query on success.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateCrewData, UpdateCrewData } from '@heist-mind/core';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';
import { crewKeys } from './queries';

export function useCreateCrew(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; data: CreateCrewData }) =>
      getRepositories().crews.create(vars.userId, vars.data).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: crewKeys.byGame(gameId) }),
  });
}

export function useUpdateCrew(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: UpdateCrewData }) =>
      getRepositories().crews.update(vars.id, vars.patch).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: crewKeys.byGame(gameId) }),
  });
}
