// Supabase GamePlayerRepository — reads from the env schema. Writes are handled
// by DB triggers (auto_assign_game_master) / the invitation flow, so only the
// read paths the journey needs are implemented.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import type { GamePlayer, UserGameContext, Result } from '../domain-types';
import type { GamePlayerRepository } from '../repositories';
import { fromSupabaseGamePlayer } from '../adapters/game-player-adapter';
import { failFromError, failFromCatch, type CoreSchema } from './result-helpers';

export class SupabaseGamePlayerRepository implements GamePlayerRepository {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly schema: CoreSchema
  ) {}

  private get db() {
    return this.client.schema(this.schema as 'development');
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

  // --- Outside the journey scope ---
  async addPlayer(): Promise<Result<GamePlayer>> {
    throw new Error('SupabaseGamePlayerRepository.addPlayer not implemented');
  }
  async removePlayer(): Promise<Result<void>> {
    throw new Error('SupabaseGamePlayerRepository.removePlayer not implemented');
  }
  async updateRole(): Promise<Result<GamePlayer>> {
    throw new Error('SupabaseGamePlayerRepository.updateRole not implemented');
  }
  async updateStatus(): Promise<Result<GamePlayer>> {
    throw new Error('SupabaseGamePlayerRepository.updateStatus not implemented');
  }
  async getUserGameContext(): Promise<Result<UserGameContext>> {
    throw new Error('SupabaseGamePlayerRepository.getUserGameContext not implemented');
  }
}
