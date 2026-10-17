// Supabase GamePlayerRepository — reads from the env schema. Membership writes are GM-only under
// RLS (00022); joins go through the invitation RPCs and the creator's row is trigger-owned
// (auto_assign_game_master).
import type { GamePlayer, Result, GameRole, PlayerStatus } from '@heist-mind/core';
import type { GamePlayerRepository } from '../repositories';
import { fromSupabaseGamePlayer } from '../adapters/game-player-adapter';
import { failFromError } from './result-helpers';
import { SupabaseRepositoryBase } from './repository-base';

export class SupabaseGamePlayerRepository
  extends SupabaseRepositoryBase
  implements GamePlayerRepository
{
  async findByGame(gameId: string): Promise<Result<GamePlayer[]>> {
    return this.run(async () => {
      const { data: rows, error } = await this.db
        .from('game_players')
        .select('*')
        .eq('game_id', gameId);
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseGamePlayer) };
    });
  }

  async findByPlayer(playerId: string): Promise<Result<GamePlayer[]>> {
    return this.run(async () => {
      const { data: rows, error } = await this.db
        .from('game_players')
        .select('*')
        .eq('player_id', playerId);
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseGamePlayer) };
    });
  }

  /**
   * GM authority = the campaign's creator (`games.created_by`). Never the game_players `role`
   * column: that row used to be self-writable, so a forged 'game_master' row passed this gate
   * through the service-role bot (F89). Mirrors the DB's is_game_gm / is_game_master.
   */
  async isGameMaster(userId: string, gameId: string): Promise<Result<boolean>> {
    return this.run(async () => {
      const { data: rows, error } = await this.db
        .from('games')
        .select('id')
        .eq('id', gameId)
        .eq('created_by', userId);
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).length > 0 };
    });
  }

  /**
   * Add a player to a game — GM-only under RLS (00022): players join through the
   * redeem_invite_code / accept_invitation RPCs, never by inserting their own row.
   */
  async addPlayer(
    gameId: string,
    playerId: string,
    _invitedBy: string,
    role: GameRole = 'player'
  ): Promise<Result<GamePlayer>> {
    return this.run(async () => {
      const { data: row, error } = await this.db
        .from('game_players')
        .insert({
          game_id: gameId,
          player_id: playerId,
          role,
          status: 'active',
          joined_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseGamePlayer(row) };
    });
  }

  async updateStatus(
    gameId: string,
    playerId: string,
    status: PlayerStatus
  ): Promise<Result<GamePlayer>> {
    return this.run(async () => {
      const { data: row, error } = await this.db
        .from('game_players')
        .update({ status })
        .eq('game_id', gameId)
        .eq('player_id', playerId)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseGamePlayer(row) };
    });
  }
}
