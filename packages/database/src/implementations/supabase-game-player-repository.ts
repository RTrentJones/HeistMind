// Supabase GamePlayerRepository — reads from the env schema. Writes are handled
// by DB triggers (auto_assign_game_master) / the invitation flow, so only the
// read paths the journey needs are implemented.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import type { GamePlayer, UserGameContext, Result, GameRole, PlayerStatus } from '../domain-types';
import type { GamePlayerRepository } from '../repositories';
import { fromSupabaseGamePlayer } from '../adapters/game-player-adapter';
import { failFromError, failFromCatch, type CoreSchema, coreSchema } from './result-helpers';

export class SupabaseGamePlayerRepository implements GamePlayerRepository {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly schema: CoreSchema
  ) {}

  private get db() {
    return coreSchema(this.client, this.schema);
  }

  async findByGame(gameId: string): Promise<Result<GamePlayer[]>> {
    try {
      const { data: rows, error } = await this.db
        .from('game_players')
        .select('*')
        .eq('game_id', gameId);
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseGamePlayer) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async findByPlayer(playerId: string): Promise<Result<GamePlayer[]>> {
    try {
      const { data: rows, error } = await this.db
        .from('game_players')
        .select('*')
        .eq('player_id', playerId);
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseGamePlayer) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async isGameMaster(userId: string, gameId: string): Promise<Result<boolean>> {
    try {
      const { data: rows, error } = await this.db
        .from('game_players')
        .select('id')
        .eq('game_id', gameId)
        .eq('player_id', userId)
        .eq('role', 'game_master')
        .eq('status', 'active');
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).length > 0 };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  /** Add a player to a game (the join flow). RLS allows a user to self-insert their own row. */
  async addPlayer(
    gameId: string,
    playerId: string,
    _invitedBy: string,
    role: GameRole = 'player'
  ): Promise<Result<GamePlayer>> {
    try {
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
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async updateStatus(
    gameId: string,
    playerId: string,
    status: PlayerStatus
  ): Promise<Result<GamePlayer>> {
    try {
      const { data: row, error } = await this.db
        .from('game_players')
        .update({ status })
        .eq('game_id', gameId)
        .eq('player_id', playerId)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseGamePlayer(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  // --- Outside the journey scope ---
  async removePlayer(): Promise<Result<void>> {
    throw new Error('SupabaseGamePlayerRepository.removePlayer not implemented');
  }
  async updateRole(): Promise<Result<GamePlayer>> {
    throw new Error('SupabaseGamePlayerRepository.updateRole not implemented');
  }
  async getUserGameContext(): Promise<Result<UserGameContext>> {
    throw new Error('SupabaseGamePlayerRepository.getUserGameContext not implemented');
  }
}
