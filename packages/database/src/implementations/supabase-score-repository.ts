// Supabase ScoreRepository — per-game scores / operations (the per-operation unit of play). At most
// one score is 'active' per game (DB partial unique index is the backstop; `start` checks first for a
// friendly error). RLS restricts writes to the game's GM.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import type { Score, CreateScoreData, UpdateScoreData, Result } from '../domain-types';
import type { ScoreRepository } from '../repositories';
import {
  fromSupabaseScore,
  toSupabaseScoreInsert,
  toSupabaseScoreUpdate,
} from '../adapters/score-adapter';
import { failFromError, failFromCatch, type CoreSchema } from './result-helpers';

export class SupabaseScoreRepository implements ScoreRepository {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly schema: CoreSchema
  ) {}

  private get db() {
    return this.client.schema(this.schema as 'development');
  }

  async findByGame(gameId: string): Promise<Result<Score[]>> {
    try {
      const { data: rows, error } = await this.db
        .from('scores')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false });
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseScore) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async findActive(gameId: string): Promise<Result<Score | null>> {
    try {
      const { data: row, error } = await this.db
        .from('scores')
        .select('*')
        .eq('game_id', gameId)
        .eq('status', 'active')
        .maybeSingle();
      if (error) return failFromError(error);
      return { success: true, data: row ? fromSupabaseScore(row) : null };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async start(userId: string, data: CreateScoreData): Promise<Result<Score>> {
    try {
      // One active score per game (the DB unique index is the backstop; this is the friendly guard).
      const active = await this.findActive(data.gameId);
      if (active.success && active.data)
        return {
          success: false,
          error: { message: 'A score is already in progress — end it first.', code: 'SCORE_ACTIVE' },
        };
      const { data: row, error } = await this.db
        .from('scores')
        .insert(toSupabaseScoreInsert(data, userId))
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseScore(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async end(id: string): Promise<Result<Score>> {
    return this.update(id, { status: 'completed' });
  }

  async update(id: string, data: UpdateScoreData): Promise<Result<Score>> {
    try {
      const { data: row, error } = await this.db
        .from('scores')
        .update(toSupabaseScoreUpdate(data, new Date().toISOString()))
        .eq('id', id)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseScore(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }
}
