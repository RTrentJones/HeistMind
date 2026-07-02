'use client';

// The invitations data-access seam (read side).
import { useQuery } from '@tanstack/react-query';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';

export const inviteKeys = {
  all: ['invitations'] as const,
  byGame: (gameId: string) => ['invitations', 'game', gameId] as const,
};

/** A campaign's invitations (the GM's join codes; filter for shareable ones component-side). */
export function useInvitesByGame(gameId: string | undefined) {
  return useQuery({
    queryKey: inviteKeys.byGame(gameId ?? ''),
    enabled: !!gameId,
    queryFn: () => getRepositories().invitations.findByGame(gameId!).then(unwrap),
  });
}
