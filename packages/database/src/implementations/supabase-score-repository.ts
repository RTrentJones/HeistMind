// Supabase ScoreRepository — per-game scores / operations (the per-operation unit of play). At most
// one score is 'active' per game (DB partial unique index is the backstop; `start` checks first for a
// friendly error). RLS restricts writes to the game's GM.
import type { Score, CreateScoreData, UpdateScoreData, Result } from '../domain-types';
import type { ScoreRepository } from '../repositories';
import {
  fromSupabaseScore,
  toSupabaseScoreInsert,
  toSupabaseScoreUpdate,
} from '../adapters/score-adapter';
import { failFromError } from './result-helpers';
import { SupabaseRepositoryBase } from './repository-base';

export class SupabaseScoreRepository extends SupabaseRepositoryBase implements ScoreRepository {
  async findByGame(gameId: string): Promise<Result<Score[]>> {
    return this.run(async () => {
      const { data: rows, error } = await this.db
        .from('scores')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false });
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseScore) };
    });
  }

  async findActive(gameId: string): Promise<Result<Score | null>> {
    return this.run(async () => {
      const { data: row, error } = await this.db
        .from('scores')
        .select('*')
        .eq('game_id', gameId)
        .eq('status', 'active')
        .maybeSingle();
      if (error) return failFromError(error);
      return { success: true, data: row ? fromSupabaseScore(row) : null };
    });
  }

  async start(userId: string, data: CreateScoreData): Promise<Result<Score>> {
    return this.run(async () => {
      // One active score per game (the DB unique index is the backstop; this is the friendly guard).
      const active = await this.findActive(data.gameId);
      if (active.success && active.data)
        return {
          success: false,
          error: {
            message: 'A score is already in progress — end it first.',
            code: 'SCORE_ACTIVE',
          },
        };
      const { data: row, error } = await this.db
        .from('scores')
        .insert(toSupabaseScoreInsert(data, userId))
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseScore(row) };
    });
  }

  async end(id: string): Promise<Result<Score>> {
    return this.update(id, { status: 'completed' });
  }

  async update(id: string, data: UpdateScoreData): Promise<Result<Score>> {
    return this.run(async () => {
      const { data: row, error } = await this.db
        .from('scores')
        .update(toSupabaseScoreUpdate(data, new Date().toISOString()))
        .eq('id', id)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseScore(row) };
    });
  }
}
