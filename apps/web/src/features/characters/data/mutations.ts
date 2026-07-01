'use client';

// The characters data-access seam (write side). Keeps every character repo write — including the
// read-modify-write ones (stress, retire) — inside the seam so components never touch a repo.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { stressBounds, type Character, type UpdateCharacterData } from '@heist-mind/database';
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
      qc.invalidateQueries({ queryKey: characterKeys.byGame(gameId) });
      qc.invalidateQueries({ queryKey: rollKeys.gamePrefix(gameId) });
    },
  });
}
