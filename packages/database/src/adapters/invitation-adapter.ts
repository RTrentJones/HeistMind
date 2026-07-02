// Type adapter for the Invitation entity (development/production schema).
import type { Tables, TablesInsert } from '../supabase-types';
import type { Invitation, InvitationStatus, CreateInvitationData } from '@heist-mind/core';
import { parseSupabaseDate } from './profile-adapter';

type InvitationRow = Tables<{ schema: 'development' }, 'invitations'>;
type InvitationInsert = TablesInsert<{ schema: 'development' }, 'invitations'>;

export function fromSupabaseInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    gameId: row.game_id,
    invitedBy: row.invited_by,
    invitedPlayer: row.invited_player,
    inviteCode: row.invite_code,
    expiresAt: row.expires_at ? parseSupabaseDate(row.expires_at) : null,
    maxUses: row.max_uses ?? 1,
    usedCount: row.used_count ?? 0,
    status: (row.status ?? 'pending') as InvitationStatus,
    createdAt: parseSupabaseDate(row.created_at),
    respondedAt: row.responded_at ? parseSupabaseDate(row.responded_at) : null,
  };
}

export function toSupabaseInvitationInsert(
  data: CreateInvitationData,
  userId: string
): InvitationInsert {
  return {
    game_id: data.gameId,
    invited_by: userId,
    invited_player: data.invitedPlayer ?? null,
    invite_code: data.inviteCode ?? null,
    expires_at: data.expiresAt ? data.expiresAt.toISOString() : null,
    max_uses: data.maxUses ?? 1,
    status: 'pending',
  };
}
