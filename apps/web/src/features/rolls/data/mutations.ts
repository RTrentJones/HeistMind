'use client';

// The rolls (campaign log) data-access seam (write side). The one mutation covers every log writer —
// action/fortune/resistance rolls, score start/end events, retire notes, and recorded results — each
// invalidating the game's log so every RollLog (campaign hub + character sheet) refetches.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateRollData, Roll } from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';
import { rollKeys } from './queries';

export function useCreateRoll(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; data: CreateRollData }): Promise<Roll> =>
      getRepositories().rolls.create(vars.userId, vars.data).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) }),
  });
}
