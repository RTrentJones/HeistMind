'use client';

// The characters data-access seam (write side). Keeps every character repo write — including the
// read-modify-write ones (stress, retire) — inside the seam so components never touch a repo.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  stressBounds,
  type Character,
  type CharacterAdvancement,
  type UpdateCharacterData,
} from '@heist-mind/database';
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
    mutationFn: (vars: {
      userId: string;
      advancement: CharacterAdvancement;
    }): Promise<Character> =>
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
 * Apply a resistance/push stress cost to a character, clamped to the ruleset max. Reads the live
 * character (for current stress + max) then writes — kept here so RollPanel never touches a repo.
 */
export function useApplyCharacterStress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { characterId: string; userId: string; stress: number }) => {
      if (vars.stress <= 0) return;
      const char = await getRepositories()
        .characters.findWithDetails(vars.characterId)
        .then(unwrap);
      if (!char) return;
      const max = stressBounds(char.ruleset.content).max;
      const current = char.characterData?.stress ?? 0;
      const next = Math.max(0, Math.min(current + vars.stress, max));
      if (next === current) return;
      await getRepositories()
        .characterManagement.updateCharacterWithValidation(vars.characterId, vars.userId, {
          characterData: { ...char.characterData, stress: next },
        })
        .then(unwrap);
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: characterKeys.detail(vars.characterId) }),
  });
}

/**
 * Retire a character: status → retired, carried coin banked into stash (BitD), plus a campaign-log
 * note. Invalidates the roster (status moved them to the retired section) and the log (the note).
 */
export function useRetireCharacter(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { character: Character; userId: string; note: string }) => {
      const data = vars.character.characterData;
      const coins = data?.coins ?? 0;
      await getRepositories()
        .characters.update(vars.character.id, vars.userId, {
          status: 'retired',
          characterData: { ...data, stash: (data?.stash ?? 0) + coins, coins: 0 },
        })
        .then(unwrap);
      await getRepositories()
        .rolls.create(vars.userId, {
          gameId,
          characterId: vars.character.id,
          kind: 'note',
          label: vars.character.name,
          dice: 0,
          results: [],
          note: vars.note,
        })
        .then(unwrap);
    },
    onSuccess: () => {
      // Retiring changes roster, My-Characters, and the sheet — invalidate the whole concept.
      qc.invalidateQueries({ queryKey: characterKeys.all });
      qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
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
