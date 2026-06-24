// Supabase RollRepository — the per-game, append-only dice-roll log. The outcome is recomputed
// server-side from the dice faces (rollOutcome), so a client can't persist a fake result.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import type { Roll, CreateRollData, Result } from '../domain-types';
import type { RollRepository } from '../repositories';
import { rollOutcome } from '../dice';
import { fromSupabaseRoll, toSupabaseRollInsert } from '../adapters/roll-adapter';
import { failFromError, failFromCatch, type CoreSchema } from './result-helpers';

export class SupabaseRollRepository implements RollRepository {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly schema: CoreSchema
  ) {}

  private get db() {
    return this.client.schema(this.schema as 'development');
  }

  async create(userId: string, data: CreateRollData): Promise<Result<Roll>> {
    try {
      const outcome = rollOutcome(data.results, { zeroDice: data.zeroDice });
      const { data: row, error } = await this.db
        .from('rolls')
        .insert(toSupabaseRollInsert(data, userId, outcome))
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseRoll(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async findByGame(gameId: string, limit = 50): Promise<Result<Roll[]>> {
    try {
      const { data: rows, error } = await this.db
        .from('rolls')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseRoll) };
    } catch (e) {
      return failFromCatch(e);
    }
  }
}
