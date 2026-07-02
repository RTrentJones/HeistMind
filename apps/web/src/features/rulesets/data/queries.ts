'use client';

// The rulesets data-access seam (read side).
import { queryOptions, skipToken, useQuery } from '@tanstack/react-query';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';

export const rulesetKeys = {
  all: ['rulesets'] as const,
  byCreator: (userId: string) => ['rulesets', 'creator', userId] as const,
};

export const rulesetQueries = {
  byCreator: (userId: string | undefined) =>
    queryOptions({
      queryKey: rulesetKeys.byCreator(userId ?? ''),
      queryFn: userId
        ? () => getRepositories().rulesets.findByCreator(userId).then(unwrap)
        : skipToken,
    }),
};

/** The user's owned rulesets. */
export function useRulesetsByCreator(userId: string | undefined) {
  return useQuery(rulesetQueries.byCreator(userId));
}
