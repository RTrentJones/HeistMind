// Supabase ClockRepository — per-game progress clocks. Fills are clamped server-side through the
// pure clock rules (clampFilled) so a tick can never overflow or go negative; the DB CHECK
// (filled BETWEEN 0 AND segments) is the backstop. RLS restricts writes to the game's GM.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import type { Clock, CreateClockData, UpdateClockData, Result } from '../domain-types';
import type { ClockRepository } from '../repositories';
import { clampFilled } from '../clocks';
import {
  fromSupabaseClock,
  toSupabaseClockInsert,
  toSupabaseClockUpdate,
} from '../adapters/clock-adapter';
import { failFromError, failFromCatch, type CoreSchema } from './result-helpers';

export class SupabaseClockRepository implements ClockRepository {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly schema: CoreSchema
  ) {}

  private get db() {
    return this.client.schema(this.schema as 'development');
  }

  async create(userId: string, data: CreateClockData): Promise<Result<Clock>> {
    try {
      const filled = clampFilled(data.filled ?? 0, data.segments);
      const { data: row, error } = await this.db
        .from('clocks')
        .insert(toSupabaseClockInsert(data, userId, filled))
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseClock(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async findByGame(gameId: string): Promise<Result<Clock[]>> {
    try {
      const { data: rows, error } = await this.db
        .from('clocks')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true });
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseClock) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async update(id: string, data: UpdateClockData): Promise<Result<Clock>> {
    try {
      // To clamp a fill we need the effective segment count — the new one if it's changing, else
      // the clock's current value. (Reading first also 404s a missing/forbidden clock cleanly.)
      let filled = data.filled;
      if (filled !== undefined) {
        const { data: current, error: readErr } = await this.db
          .from('clocks')
          .select('segments')
          .eq('id', id)
          .single();
        if (readErr) return failFromError(readErr);
        filled = clampFilled(filled, data.segments ?? current.segments);
      }
      const { data: row, error } = await this.db
        .from('clocks')
        .update(toSupabaseClockUpdate({ ...data, filled }, new Date().toISOString()))
        .eq('id', id)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseClock(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      const { error } = await this.db.from('clocks').delete().eq('id', id);
      if (error) return failFromError(error);
      return { success: true, data: undefined };
    } catch (e) {
      return failFromCatch(e);
    }
  }
}
