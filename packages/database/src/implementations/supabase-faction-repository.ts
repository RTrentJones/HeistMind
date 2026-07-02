// Supabase FactionRepository — per-game factions + status. Tier/status are clamped server-side
// through the pure faction bounds (in the adapter); the DB CHECK constraints are the backstop.
// RLS restricts writes to the game's GM. Faction "projects" reuse the clocks table (a clock with
// linked_type='faction', linked_id=<faction>).
import type { Faction, CreateFactionData, UpdateFactionData, Result } from '../domain-types';
import type { FactionRepository } from '../repositories';
import {
  fromSupabaseFaction,
  toSupabaseFactionInsert,
  toSupabaseFactionUpdate,
} from '../adapters/faction-adapter';
import { failFromError } from './result-helpers';
import { SupabaseRepositoryBase } from './repository-base';

export class SupabaseFactionRepository extends SupabaseRepositoryBase implements FactionRepository {
  async findByGame(gameId: string): Promise<Result<Faction[]>> {
    return this.run(async () => {
      const { data: rows, error } = await this.db
        .from('factions')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true });
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseFaction) };
    });
  }

  async create(userId: string, data: CreateFactionData): Promise<Result<Faction>> {
    return this.run(async () => {
      const { data: row, error } = await this.db
        .from('factions')
        .insert(toSupabaseFactionInsert(data, userId))
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseFaction(row) };
    });
  }

  async update(id: string, data: UpdateFactionData): Promise<Result<Faction>> {
    return this.run(async () => {
      const { data: row, error } = await this.db
        .from('factions')
        .update(toSupabaseFactionUpdate(data, new Date().toISOString()))
        .eq('id', id)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseFaction(row) };
    });
  }

  async delete(id: string): Promise<Result<void>> {
    return this.run(async () => {
      const { error } = await this.db.from('factions').delete().eq('id', id);
      if (error) return failFromError(error);
      return { success: true, data: undefined };
    });
  }
}
