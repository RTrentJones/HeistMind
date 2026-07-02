'use client';

// The rulesets data-access seam (write side).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateRulesetData, RulesetContent } from '@heist-mind/core';
import { getRepositories } from '@/lib/auth';
import { RepositoryError, unwrap } from '@/lib/query/result';
import { rulesetKeys } from './queries';

/** Persist a validated ruleset upload. */
export function useCreateRuleset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; data: CreateRulesetData }) =>
      getRepositories().rulesets.create(vars.userId, vars.data).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: rulesetKeys.all }),
  });
}

/**
 * Load a built-in ruleset as an owned copy: create, or — if the GM already has it (UNIQUE
 * name+creator) — REFRESH that copy's content to the latest bundle, so a ruleset loaded before a
 * content update picks up new mechanics (crew, factions, ability rules, …). Returns which of the
 * two happened so the button can phrase its confirmation.
 */
export function useLoadBuiltinRuleset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      userId: string;
      content: RulesetContent;
    }): Promise<'created' | 'refreshed'> => {
      const { userId, content } = vars;
      const repos = getRepositories();
      const created = await repos.rulesets.create(userId, {
        name: content.metadata.name,
        version: content.metadata.version,
        description: content.metadata.description,
        content,
      });
      if (created.success) return 'created';

      const raw = created.error?.message ?? '';
      const duplicate =
        created.error?.code === '23505' || /duplicate|already exists|unique/i.test(raw);
      if (!duplicate) throw new RepositoryError(raw, created.error?.code);

      const mine = await repos.rulesets.findByCreator(userId).then(unwrap);
      const existing = mine.find(r => r.name === content.metadata.name);
      if (!existing) throw new RepositoryError(raw, created.error?.code);
      await repos.rulesets
        .update(existing.id, userId, {
          version: content.metadata.version,
          description: content.metadata.description,
          content,
        })
        .then(unwrap);
      return 'refreshed';
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: rulesetKeys.all }),
  });
}
