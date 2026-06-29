// Supabase FactionRepository — per-game factions + status. Tier/status are clamped server-side
// through the pure faction bounds (in the adapter); the DB CHECK constraints are the backstop.
// RLS restricts writes to the game's GM. Faction "projects" reuse the clocks table (a clock with
// linked_type='faction', linked_id=<faction>).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import type { Faction, CreateFactionData, UpdateFactionData, Result } from '../domain-types';
import type { FactionRepository } from '../repositories';
import {
  fromSupabaseFaction,
  toSupabaseFactionInsert,
  toSupabaseFactionUpdate,
} from '../adapters/faction-adapter';
import { failFromError, failFromCatch, type CoreSchema, coreSchema } from './result-helpers';

export class SupabaseFactionRepository implements FactionRepository {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly schema: CoreSchema
  ) {}

  private get db() {
    return coreSchema(this.client, this.schema);
  }

  async findByGame(gameId: string): Promise<Result<Faction[]>> {
    try {
      const { data: rows, error } = await this.db
        .from('factions')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true });
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseFaction) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async create(userId: string, data: CreateFactionData): Promise<Result<Faction>> {
    try {
      const { data: row, error } = await this.db
        .from('factions')
        .insert(toSupabaseFactionInsert(data, userId))
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseFaction(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async update(id: string, data: UpdateFactionData): Promise<Result<Faction>> {
    try {
      const { data: row, error } = await this.db
        .from('factions')
        .update(toSupabaseFactionUpdate(data, new Date().toISOString()))
        .eq('id', id)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseFaction(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      const { error } = await this.db.from('factions').delete().eq('id', id);
      if (error) return failFromError(error);
      return { success: true, data: undefined };
    } catch (e) {
      return failFromCatch(e);
    }
  }
}
