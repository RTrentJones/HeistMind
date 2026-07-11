'use client';

// The rolls (campaign log) data-access seam (write side). The one mutation covers every log writer —
// action/fortune/resistance rolls, score start/end events, retire notes, and recorded results — each
// invalidating the game's log so every RollLog (campaign hub + character sheet) refetches.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateRollData, Roll } from '@heist-mind/core';
import {
  rollAction,
  rollResistance,
  type ActionRollInput,
  type ResistanceRollInput,
} from '@heist-mind/engine';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';
import { characterKeys } from '@/features/characters/data/queries';
import { rollKeys } from './queries';

export function useCreateRoll(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; data: CreateRollData }): Promise<Roll> =>
      getRepositories().rolls.create(vars.userId, vars.data).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) }),
  });
}

/**
 * An action/fortune roll through the ENGINE use-case (persist + push-cost sequencing — the same
 * implementation the Discord bot will drive). Invalidates the log and, when stress was charged,
 * the character's sheet.
 */
export function useActionRoll(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<ActionRollInput, 'gameId'>): Promise<Roll> =>
      unwrap(await rollAction(getRepositories(), { ...input, gameId })),
    onSuccess: (_roll, input) => {
      void qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
      if (input.pushed === true && input.characterId !== undefined) {
        void qc.invalidateQueries({ queryKey: characterKeys.detail(input.characterId) });
      }
      // An assist may have charged the helper's stress (F10) — refresh their sheet too.
      if (input.assist !== undefined) {
        void qc.invalidateQueries({ queryKey: characterKeys.detail(input.assist.characterId) });
      }
    },
  });
}

/** A resistance roll through the ENGINE use-case (persist + stress cost). */
export function useResistanceRoll(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<ResistanceRollInput, 'gameId'>
    ): Promise<{ roll: Roll; stress: number }> =>
      unwrap(await rollResistance(getRepositories(), { ...input, gameId })),
    onSuccess: (_out, input) => {
      void qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
      if (input.characterId !== undefined) {
        void qc.invalidateQueries({ queryKey: characterKeys.detail(input.characterId) });
      }
    },
  });
}
