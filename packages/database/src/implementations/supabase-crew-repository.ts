// Supabase CrewRepository — the one shared crew sheet per game. Stats are clamped server-side
// through the pure crew bounds (in the adapter); the DB CHECK constraints are the backstop. RLS
// restricts writes to the game's GM.
import type { Crew, CreateCrewData, UpdateCrewData, Result } from '../domain-types';
import type { CrewRepository } from '../repositories';
import {
  fromSupabaseCrew,
  toSupabaseCrewInsert,
  toSupabaseCrewUpdate,
} from '../adapters/crew-adapter';
import { failFromError } from './result-helpers';
import { SupabaseRepositoryBase } from './repository-base';

export class SupabaseCrewRepository extends SupabaseRepositoryBase implements CrewRepository {
  /** The game's crew, or null when none has been created yet. */
  async findByGame(gameId: string): Promise<Result<Crew | null>> {
    return this.run(async () => {
      const { data: row, error } = await this.db
        .from('crews')
        .select('*')
        .eq('game_id', gameId)
        .maybeSingle();
      if (error) return failFromError(error);
      return { success: true, data: row ? fromSupabaseCrew(row) : null };
    });
  }

  async create(userId: string, data: CreateCrewData): Promise<Result<Crew>> {
    return this.run(async () => {
      const { data: row, error } = await this.db
        .from('crews')
        .insert(toSupabaseCrewInsert(data, userId))
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseCrew(row) };
    });
  }

  async update(id: string, data: UpdateCrewData): Promise<Result<Crew>> {
    return this.run(async () => {
      const { data: row, error } = await this.db
        .from('crews')
        .update(toSupabaseCrewUpdate(data, new Date().toISOString()))
        .eq('id', id)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseCrew(row) };
    });
  }
}
