'use client';

// The profiles data-access seam (read side). Profiles are looked up to attribute characters/rolls to
// a player name; names are stable, so they cache long. `useQueries` dedupes + caches per id.
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';

export const profileKeys = {
  all: ['profiles'] as const,
  detail: (id: string) => ['profiles', 'detail', id] as const,
};

/** Resolve a set of profile ids → a `{ id: displayName }` map (createdBy → player attribution). */
export function useProfileNames(ids: string[]): Record<string, string> {
  const unique = [...new Set(ids)];
  const results = useQueries({
    queries: unique.map(id => ({
      queryKey: profileKeys.detail(id),
      queryFn: () => getRepositories().profiles.findById(id).then(unwrap),
      staleTime: 5 * 60_000,
    })),
  });
  // Memoize the map so consumers get a stable reference between renders. `results` (and often
  // `ids`) change identity every render; key on the resolved data via joined-string deps instead.
  return useMemo(() => {
    const map: Record<string, string> = {};
    unique.forEach((id, i) => {
      const p = results[i]?.data;
      if (p) map[id] = p.displayName || p.username || '';
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unique.join(','), results.map(r => r.dataUpdatedAt).join(',')]);
}
