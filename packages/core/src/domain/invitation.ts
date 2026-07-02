// Campaign invitations: targeted invites + shareable join codes.
export interface Invitation {
  id: string;
  gameId: string;
  invitedBy: string;
  invitedPlayer: string | null;
  inviteCode: string | null;
  expiresAt: Date | null;
  maxUses: number;
  usedCount: number;
  status: InvitationStatus;
  createdAt: Date;
  respondedAt: Date | null;
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';

export interface CreateInvitationData {
  gameId: string;
  invitedPlayer?: string;
  inviteCode?: string;
  expiresAt?: Date;
  maxUses?: number;
}

export interface JoinGameData {
  gameId: string;
  invitationId?: string;
  inviteCode?: string;
}
