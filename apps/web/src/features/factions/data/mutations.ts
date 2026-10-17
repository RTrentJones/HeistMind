'use client';

// The factions data-access seam (write side). Each mutation invalidates the game's factions query.
// Status shifts go through the ENGINE use-case (persist + 'faction' feed event in one operation).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clampFactionStatus, type CreateFactionData, type Faction } from '@heist-mind/core';
import { setFactionStatus } from '@heist-mind/engine';
import { rollKeys } from '@/features/rolls/data/queries';
import { getRepositories } from '@/lib/auth';
import { removeFromList, replaceInList } from '@/lib/query/cache';
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

/**
 * Shift a faction's tier by ±1 from the FRESHEST cached value (clamped 0…6) — a quick double-click
 * can't compute both steps from the same stale tier (review item 3).
 */
export function useShiftFactionTier(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { faction: Faction; delta: number }) => {
      const cached = qc
        .getQueryData<Faction[]>(factionKeys.byGame(gameId))
        ?.find(f => f.id === vars.faction.id);
      const tier = Math.max(0, Math.min(6, (cached ?? vars.faction).tier + vars.delta));
      return getRepositories().factions.update(vars.faction.id, { tier }).then(unwrap);
    },
    onSuccess: async (faction: Faction) => {
      replaceInList(qc, factionKeys.byGame(gameId), faction);
      await qc.invalidateQueries({ queryKey: factionKeys.byGame(gameId) });
    },
  });
}

export function useDeleteFaction(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getRepositories().factions.delete(id).then(unwrap),
    onSuccess: async (_d, id) => {
      removeFromList<Faction>(qc, factionKeys.byGame(gameId), id);
      await qc.invalidateQueries({ queryKey: factionKeys.byGame(gameId) });
    },
  });
}

/** Shift a faction's status via the ENGINE (clamped −3…+3 + 'faction' feed event). */
export function useSetFactionStatus(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      faction: Faction;
      userId: string;
      /** Status steps to shift (±1); applied to the FRESHEST cached status, then clamped. */
      delta: number;
      logLabel: string;
      /** Feed copy for the status actually landed on (computed from the fresh value). */
      logNote: (status: number) => string;
    }) => {
      const cached = qc
        .getQueryData<Faction[]>(factionKeys.byGame(gameId))
        ?.find(f => f.id === vars.faction.id);
      const faction = cached ?? vars.faction;
      const status = clampFactionStatus(faction.status + vars.delta);
      return unwrap(
        await setFactionStatus(getRepositories(), {
          faction,
          userId: vars.userId,
          status,
          logLabel: vars.logLabel,
          logNote: vars.logNote(status),
        })
      );
    },
    onSuccess: async (faction: Faction) => {
      replaceInList(qc, factionKeys.byGame(gameId), faction);
      await Promise.all([
        qc.invalidateQueries({ queryKey: factionKeys.byGame(gameId) }),
        qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) }),
      ]);
    },
  });
}
