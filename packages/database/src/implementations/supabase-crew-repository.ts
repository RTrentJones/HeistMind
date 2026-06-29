// Supabase CrewRepository — the one shared crew sheet per game. Stats are clamped server-side
// through the pure crew bounds (in the adapter); the DB CHECK constraints are the backstop. RLS
// restricts writes to the game's GM.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import type { Crew, CreateCrewData, UpdateCrewData, Result } from '../domain-types';
import type { CrewRepository } from '../repositories';
import {
  fromSupabaseCrew,
  toSupabaseCrewInsert,
  toSupabaseCrewUpdate,
} from '../adapters/crew-adapter';
import { failFromError, failFromCatch, type CoreSchema, coreSchema } from './result-helpers';

export class SupabaseCrewRepository implements CrewRepository {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly schema: CoreSchema
  ) {}

  private get db() {
    return coreSchema(this.client, this.schema);
  }

  /** The game's crew, or null when none has been created yet. */
  async findByGame(gameId: string): Promise<Result<Crew | null>> {
    try {
      const { data: row, error } = await this.db
        .from('crews')
        .select('*')
        .eq('game_id', gameId)
        .maybeSingle();
      if (error) return failFromError(error);
      return { success: true, data: row ? fromSupabaseCrew(row) : null };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async create(userId: string, data: CreateCrewData): Promise<Result<Crew>> {
    try {
      const { data: row, error } = await this.db
        .from('crews')
        .insert(toSupabaseCrewInsert(data, userId))
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseCrew(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async update(id: string, data: UpdateCrewData): Promise<Result<Crew>> {
    try {
      const { data: row, error } = await this.db
        .from('crews')
        .update(toSupabaseCrewUpdate(data, new Date().toISOString()))
        .eq('id', id)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseCrew(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }
}
