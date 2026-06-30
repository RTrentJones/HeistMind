'use client';

// The rulesets data-access seam (read side).
import { useQuery } from '@tanstack/react-query';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';

export const rulesetKeys = {
  all: ['rulesets'] as const,
  byCreator: (userId: string) => ['rulesets', 'creator', userId] as const,
};

/** The user's owned rulesets. */
export function useRulesetsByCreator(userId: string | undefined) {
  return useQuery({
    queryKey: rulesetKeys.byCreator(userId ?? ''),
    enabled: !!userId,
    queryFn: () => getRepositories().rulesets.findByCreator(userId!).then(unwrap),
  });
}
