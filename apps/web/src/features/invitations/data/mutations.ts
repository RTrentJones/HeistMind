'use client';

// The invitations data-access seam (write side).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { JOIN_CODE_USES } from '@heist-mind/core';
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
        .invitations.create(vars.userId, { gameId, maxUses: vars.maxUses ?? JOIN_CODE_USES })
        .then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: inviteKeys.byGame(gameId) }),
  });
}

/** GM: revoke a join code (status 'revoked' — GM-only UPDATE under RLS, 00022 B3). */
export function useRevokeInviteCode(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { invitationId: string; userId: string }) =>
      getRepositories().invitations.revoke(vars.invitationId, vars.userId).then(unwrap),
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

/** Why a join failed, as a stable key for the UI copy (the 00023 RPC raises a specific message). */
export type JoinFailure =
  | 'notFound'
  | 'revoked'
  | 'expired'
  | 'usedUp'
  | 'removed'
  | 'full'
  | 'generic';

export function joinFailureReason(err: unknown): JoinFailure {
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  // 00026: every seat is taken. The raw CHECK name covers a pre-00026 schema (the 6-seat cap
  // surfaced as a 23514 "violates check constraint …_games_current_players_check").
  if (msg.includes('campaign is full') || msg.includes('games_current_players_check'))
    return 'full';
  if (msg.includes('revoked')) return 'revoked';
  if (msg.includes('no uses left')) return 'usedUp';
  if (msg.includes('expired')) return 'expired';
  if (msg.includes('removed from this campaign')) return 'removed';
  if (msg.includes('not found') || msg.includes('no longer active')) return 'notFound';
  return 'generic';
}

/** Normalise what a person typed or pasted: trim, upper-case, drop inner spaces/dashes. */
export function normalizeJoinCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '');
}
