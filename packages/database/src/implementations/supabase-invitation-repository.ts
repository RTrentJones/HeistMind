// Supabase InvitationRepository — invites + join codes, queried against the env schema.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import type {
  Invitation,
  GamePlayer,
  CreateInvitationData,
  JoinGameData,
  Result,
} from '../domain-types';
import type { InvitationRepository } from '../repositories';
import { fromSupabaseInvitation, toSupabaseInvitationInsert } from '../adapters/invitation-adapter';
import { fromSupabaseGamePlayer } from '../adapters/game-player-adapter';
import { failFromError, failFromCatch, NO_ROWS, type CoreSchema } from './result-helpers';

/** Generate a short, human-shareable invite code (avoids ambiguous chars like O/0, I/1). */
function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export class SupabaseInvitationRepository implements InvitationRepository {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly schema: CoreSchema
  ) {}

  private get db() {
    return this.client.schema(this.schema as 'development');
  }

  async create(userId: string, data: CreateInvitationData): Promise<Result<Invitation>> {
    try {
      const insert = toSupabaseInvitationInsert(data, userId);
      // Generate a code for a public (non-targeted) invite when one wasn't supplied.
      if (!insert.invite_code && !insert.invited_player) insert.invite_code = generateInviteCode();
      const { data: row, error } = await this.db
        .from('invitations')
        .insert(insert)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseInvitation(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async findById(id: string): Promise<Result<Invitation | null>> {
    try {
      const { data: row, error } = await this.db
        .from('invitations')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === NO_ROWS) return { success: true, data: null };
        return failFromError(error);
      }
      return { success: true, data: fromSupabaseInvitation(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async findByGame(gameId: string): Promise<Result<Invitation[]>> {
    try {
      const { data: rows, error } = await this.db
        .from('invitations')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false });
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseInvitation) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  /** Invitations targeted at this user (RLS exposes `invited_player = auth.uid()` rows). */
  async findByPlayer(userId: string): Promise<Result<Invitation[]>> {
    try {
      const { data: rows, error } = await this.db
        .from('invitations')
        .select('*')
        .eq('invited_player', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseInvitation) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async findByCode(inviteCode: string): Promise<Result<Invitation | null>> {
    try {
      const { data: row, error } = await this.db
        .from('invitations')
        .select('*')
        .eq('invite_code', inviteCode)
        .single();
      if (error) {
        if (error.code === NO_ROWS) return { success: true, data: null };
        return failFromError(error);
      }
      return { success: true, data: fromSupabaseInvitation(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  /** Accept a targeted invite: add the caller to the game, then mark the invite accepted. */
  async accept(invitationId: string, userId: string): Promise<Result<GamePlayer>> {
    try {
      const inv = await this.findById(invitationId);
      if (!inv.success) return inv;
      if (!inv.data)
        return { success: false, error: { message: 'Invitation not found', code: 'NOT_FOUND' } };

      const { data: gpRow, error: gpError } = await this.db
        .from('game_players')
        .insert({ game_id: inv.data.gameId, player_id: userId, role: 'player', status: 'active' })
        .select()
        .single();
      if (gpError) return failFromError(gpError);

      await this.db
        .from('invitations')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', invitationId);

      return { success: true, data: fromSupabaseGamePlayer(gpRow) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async decline(invitationId: string, _userId: string): Promise<Result<Invitation>> {
    return this.setStatus(invitationId, 'declined');
  }

  async revoke(invitationId: string, _userId: string): Promise<Result<Invitation>> {
    return this.setStatus(invitationId, 'revoked');
  }

  private async setStatus(
    invitationId: string,
    status: 'declined' | 'revoked'
  ): Promise<Result<Invitation>> {
    try {
      const { data: row, error } = await this.db
        .from('invitations')
        .update({ status, responded_at: new Date().toISOString() })
        .eq('id', invitationId)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseInvitation(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  /** Redeem a public join code via the SECURITY DEFINER RPC (migration 00009). */
  async joinViaCode(data: JoinGameData, _userId: string): Promise<Result<GamePlayer>> {
    try {
      const code = data.inviteCode;
      if (!code) {
        return {
          success: false,
          error: { message: 'An invite code is required', code: 'VALIDATION' },
        };
      }
      // redeem_invite_code isn't in the generated DB types yet — call it through a narrow cast.
      const { data: row, error } = await (
        this.db as unknown as {
          rpc: (
            fn: string,
            args: Record<string, unknown>
          ) => Promise<{
            data: unknown;
            error: { message: string; code?: string; details?: string } | null;
          }>;
        }
      ).rpc('redeem_invite_code', { p_code: code });
      if (error) return failFromError(error);
      if (!row)
        return {
          success: false,
          error: { message: 'Could not join with that code', code: 'JOIN_FAILED' },
        };
      return {
        success: true,
        data: fromSupabaseGamePlayer(row as Parameters<typeof fromSupabaseGamePlayer>[0]),
      };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async cleanupExpired(): Promise<Result<number>> {
    throw new Error('SupabaseInvitationRepository.cleanupExpired not implemented');
  }
}
