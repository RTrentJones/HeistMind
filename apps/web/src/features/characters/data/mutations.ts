'use client';

// The characters data-access seam (write side). Keeps every character repo write — including the
// read-modify-write ones (stress, retire) — inside the seam so components never touch a repo.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Character,
  CharacterAdvancement,
  CharacterLoadout,
  CharacterWithDetails,
  UpdateCharacterData,
} from '@heist-mind/core';
import {
  applyStress,
  indulgeVice,
  retireCharacter,
  saveLoadout,
  type IndulgeViceOutcome,
} from '@heist-mind/engine';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';
import { rollKeys } from '@/features/rolls/data/queries';
import { characterKeys } from './queries';

/**
 * Plain character update (name, loadout, status…). Invalidates every character query — a rename or
 * status change shows in the roster + My-Characters lists as well as the sheet.
 */
export function useUpdateCharacter(characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; data: UpdateCharacterData }): Promise<Character> =>
      getRepositories().characters.update(characterId, vars.userId, vars.data).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: characterKeys.all }),
  });
}

/** Validated character-data write (stress, XP marks, downtime) — runs the ruleset validation path. */
export function useUpdateCharacterData(characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; data: UpdateCharacterData }): Promise<Character> =>
      getRepositories()
        .characterManagement.updateCharacterWithValidation(characterId, vars.userId, vars.data)
        .then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: characterKeys.all }),
  });
}

/**
 * Spend XP on an advancement (ability purchase / action dot) through the validated repo path —
 * the server gates on cost, prerequisites, and (for action dots) the track being full.
 */
export function useAdvanceCharacter(characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; advancement: CharacterAdvancement }): Promise<Character> =>
      getRepositories()
        .characterManagement.advanceCharacter(characterId, vars.userId, vars.advancement)
        .then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: characterKeys.all }),
  });
}

/** Award XP through the repository's experience path (records the reason). */
export function useAddExperience(characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; amount: number; reason: string }): Promise<Character> =>
      getRepositories()
        .characters.addExperience(characterId, vars.userId, vars.amount, vars.reason)
        .then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: characterKeys.all }),
  });
}

/**
 * Apply a resistance/push stress cost to a character via the ENGINE use-case (clamped
 * read-modify-write) — the same implementation the Discord bot will drive.
 */
export function useApplyCharacterStress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { characterId: string; userId: string; stress: number }) =>
      unwrap(await applyStress(getRepositories(), vars)),
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: characterKeys.detail(vars.characterId) }),
  });
}

/**
 * Indulge Vice (FitD downtime) via the ENGINE use-case: clear stress through the validated write
 * path, then log the downtime to the campaign feed. The component realizes the dice (pool from
 * `viceDicePool`) and phrases the copy; the outcome comes back as data.
 */
export function useIndulgeVice(gameId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      character: CharacterWithDetails;
      userId: string;
      results: number[];
      zeroDice: boolean;
      logLabel: string;
    }): Promise<IndulgeViceOutcome> => unwrap(await indulgeVice(getRepositories(), vars)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: characterKeys.all });
      if (gameId !== null) void qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
    },
  });
}

/**
 * Persist the per-score loadout via the ENGINE use-case (save + one feed entry per save).
 */
export function useSaveLoadout(gameId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      character: CharacterWithDetails;
      userId: string;
      loadout: CharacterLoadout;
      logNote: string;
    }): Promise<Character> => unwrap(await saveLoadout(getRepositories(), vars)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: characterKeys.all });
      if (gameId !== null) void qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
    },
  });
}

/**
 * Retire a character via the ENGINE use-case: status → retired, carried coin banked into stash
 * (BitD), plus a campaign-log note.
 */
export function useRetireCharacter(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { character: Character; userId: string; note: string }) =>
      unwrap(
        await retireCharacter(getRepositories(), {
          character: vars.character,
          userId: vars.userId,
          gameId,
          logNote: vars.note,
        })
      ),
    onSuccess: () => {
      // Retiring changes roster, My-Characters, and the sheet — invalidate the whole concept.
      void qc.invalidateQueries({ queryKey: characterKeys.all });
      void qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
    },
  });
}

/** Duplicate a character into a new standalone copy (Phase 5b — an exact snapshot, owner-only). */
export function useCloneCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { characterId: string; userId: string; name: string }): Promise<Character> =>
      getRepositories()
        .characters.cloneCharacter(vars.characterId, vars.userId, vars.name)
        .then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: characterKeys.all }),
  });
}

/**
 * Attach/move a character into a campaign (the `attach_character_to_game` SECURITY DEFINER RPC —
 * ownership, membership, and ruleset match are re-checked server-side). Flips `gameId`, so every
 * character query (detail, both rosters, My Characters) is invalidated.
 */
export function useAttachCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { characterId: string; gameId: string }): Promise<Character> =>
      getRepositories().characters.attachToGame(vars.characterId, vars.gameId).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: characterKeys.all }),
  });
}

/** Return a character to standalone ("My Characters") via the `detach_character` RPC. */
export function useDetachCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (characterId: string): Promise<Character> =>
      getRepositories().characters.detachFromGame(characterId).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: characterKeys.all }),
  });
}
