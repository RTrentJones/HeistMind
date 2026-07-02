'use client';

// The games data-access seam (write side).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateGameData } from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';
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
