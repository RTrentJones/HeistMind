'use client';

// The invitations data-access seam (write side).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getRepositories } from '@/lib/auth';
import { unwrap } from '@/lib/query/result';
import { gameKeys } from '@/features/games/data/queries';
import { inviteKeys } from './queries';

/** GM: generate a shareable join code for a campaign. */
export function useCreateInviteCode(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; maxUses?: number }) =>
      getRepositories()
        .invitations.create(vars.userId, { gameId, maxUses: vars.maxUses ?? 20 })
        .then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: inviteKeys.byGame(gameId) }),
  });
}

/**
 * Player: redeem a join code (the `redeem_invite_code` RPC — the code carries the campaign).
 * Invalidates every games query so the joined campaign appears in the lists + dashboard.
 */
export function useJoinViaCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; inviteCode: string }) =>
      getRepositories()
        .invitations.joinViaCode({ gameId: '', inviteCode: vars.inviteCode }, vars.userId)
        .then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: gameKeys.all }),
  });
}
