// Supabase GamePlayerRepository — reads from the env schema. Writes are handled
// by DB triggers (auto_assign_game_master) / the invitation flow, so only the
// read paths the journey needs are implemented.
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

  async isGameMaster(userId: string, gameId: string): Promise<Result<boolean>> {
    return this.run(async () => {
      const { data: rows, error } = await this.db
        .from('game_players')
        .select('id')
        .eq('game_id', gameId)
        .eq('player_id', userId)
        .eq('role', 'game_master')
        .eq('status', 'active');
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).length > 0 };
    });
  }

  /** Add a player to a game (the join flow). RLS allows a user to self-insert their own row. */
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
