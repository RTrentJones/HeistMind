'use client';

// The characters data-access seam (write side). Keeps every character repo write — including the
// read-modify-write ones (stress, retire) — inside the seam so components never touch a repo.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Character,
  CharacterAdvancement,
  CharacterData,
  CharacterLoadout,
  CharacterWithDetails,
  HarmLevel,
  UpdateCharacterData,
} from '@heist-mind/core';
import {
  advanceCharacter,
  applyStress,
  chooseTrauma,
  clearHarm,
  flashback,
  indulgeVice,
  markXp,
  retireCharacter,
  saveCharacterBuild,
  saveLoadout,
  setStress,
  takeHarm,
  type IndulgeViceOutcome,
  type TraumaLogCopy,
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

/**
 * Set stress to an absolute value (the sheet's live tracker) via the ENGINE: it re-reads the live
 * row and patches ONLY `stress`, so a stale sheet can't revert harm/XP another client wrote
 * (review item 2). Awaits the refetch so the tracker re-enables on the fresh value.
 */
export function useSetCharacterStress(characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { userId: string; stress: number }) =>
      unwrap(await setStress(getRepositories(), { characterId, ...vars })),
    onSuccess: () => qc.invalidateQueries({ queryKey: characterKeys.all }),
  });
}

/**
 * Save the build editor's draft via the ENGINE as a field-level PATCH onto the live row (only the
 * fields changed vs `base`); a field also changed elsewhere fails with `CHARACTER_CONFLICT`.
 * Invalidation runs on success AND conflict (settled) so the editor can rebase on fresh data.
 */
export function useSaveCharacterBuild(characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { userId: string; base: CharacterData; draft: CharacterData }) =>
      unwrap(await saveCharacterBuild(getRepositories(), { characterId, ...vars })),
    onSettled: () => qc.invalidateQueries({ queryKey: characterKeys.all }),
  });
}

/**
 * Spend XP on an advancement (ability purchase / action dot) via the ENGINE: the validated repo
 * path gates cost/prereqs/track server-side, then the advance lands in the campaign feed as an
 * 'xp' event (BRD R-C3). Standalone characters (gameId null) skip the feed.
 */
export function useAdvanceCharacter(characterId: string, gameId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      userId: string;
      advancement: CharacterAdvancement;
      logLabel: string;
      logNote: string;
    }): Promise<Character> =>
      unwrap(await advanceCharacter(getRepositories(), { characterId, ...vars })),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: characterKeys.all });
      if (gameId !== null) await qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
    },
  });
}

/**
 * Award XP via the ENGINE (records the reason + logs an 'xp' feed event when in a campaign).
 * On a track-mode ruleset pass `track` ('playbook' or an attribute id) and a signed `amount` —
 * the engine marks that track through the validated write; flat-pool rulesets bank the amount.
 */
export function useAddExperience(characterId: string, gameId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      userId: string;
      amount: number;
      reason: string;
      track?: string;
      logLabel: string;
      logNote: string;
    }): Promise<Character> => unwrap(await markXp(getRepositories(), { characterId, ...vars })),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: characterKeys.all });
      if (gameId !== null) await qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
    },
  });
}

/**
 * Take harm via the ENGINE (RAW escalation past full tracks + a 'harm' feed event — the same
 * implementation the bot's `/harm take` drives; F65 closes the web side). Returns the level the
 * harm actually LANDED at so the sheet can flag an escalation.
 */
export function useTakeHarm(characterId: string, gameId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      userId: string;
      level: HarmLevel;
      description: string;
      /** F44 — expend armor from the loadout; the harm lands one level lighter (null = absorbed). */
      spendArmor?: boolean;
      logLabel: string;
      logNote: (appliedLevel: HarmLevel | null) => string;
    }) => unwrap(await takeHarm(getRepositories(), { characterId, ...vars })),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: characterKeys.all });
      if (gameId !== null) await qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
    },
  });
}

/** Clear ONE harm entry via the ENGINE (recovery; logs a 'harm' feed event — F65 web parity). */
export function useClearHarm(characterId: string, gameId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      userId: string;
      level: HarmLevel;
      description: string;
      logLabel: string;
      logNote: string;
    }): Promise<Character> => unwrap(await clearHarm(getRepositories(), { characterId, ...vars })),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: characterKeys.all });
      if (gameId !== null) await qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
    },
  });
}

/**
 * A BitD flashback (F16) via the ENGINE: pay the GM-priced stress (clamped) and land the
 * retro-established action in the campaign feed.
 */
export function useFlashback(gameId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      character: CharacterWithDetails;
      userId: string;
      stress: number;
      logLabel: string;
      logNote: string;
      traumaLog?: TraumaLogCopy;
    }) => unwrap(await flashback(getRepositories(), vars)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: characterKeys.all });
      if (gameId !== null) await qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
    },
  });
}

/**
 * Mark stress via the ENGINE (RAW: marking the LAST box is trauma — stress resets to 0 and a
 * condition is owed; the overflow is logged to the campaign feed). Used for the sheet tracker's
 * increases; clears stay a plain validated write.
 */
export function useApplyStress(characterId: string, gameId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { userId: string; stress: number; traumaLog: TraumaLogCopy }) =>
      unwrap(await applyStress(getRepositories(), { characterId, ...vars })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: characterKeys.all });
      if (gameId !== null) void qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
    },
  });
}

/** Resolve an owed trauma by marking the chosen condition (ENGINE chooseTrauma + feed note). */
export function useChooseTrauma(characterId: string, gameId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      userId: string;
      condition: string;
      logNote: string;
      retireNote: string;
    }) => unwrap(await chooseTrauma(getRepositories(), { characterId, ...vars })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: characterKeys.all });
      if (gameId !== null) void qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
    },
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
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: characterKeys.all });
      if (gameId !== null) await qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
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
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: characterKeys.all });
      if (gameId !== null) await qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
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
    onSuccess: async () => {
      // Retiring changes roster, My-Characters, and the sheet — invalidate the whole concept.
      await qc.invalidateQueries({ queryKey: characterKeys.all });
      await qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
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

/** Owner: delete a character for good. The campaign log keeps its entries (unlinked). */
export function useDeleteCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { characterId: string }) =>
      getRepositories().characters.delete(vars.characterId).then(unwrap),
    onSuccess: (_d, vars) => {
      qc.removeQueries({ queryKey: characterKeys.detail(vars.characterId) });
      return qc.invalidateQueries({ queryKey: characterKeys.all });
    },
  });
}
