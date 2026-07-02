// Supabase ClockRepository — per-game progress clocks. Fills are clamped server-side through the
// pure clock rules (clampFilled) so a tick can never overflow or go negative; the DB CHECK
// (filled BETWEEN 0 AND segments) is the backstop. RLS restricts writes to the game's GM.
import type { Clock, CreateClockData, UpdateClockData, Result } from '@heist-mind/core';
import type { ClockRepository } from '../repositories';
import { clampFilled } from '@heist-mind/core';
import {
  fromSupabaseClock,
  toSupabaseClockInsert,
  toSupabaseClockUpdate,
} from '../adapters/clock-adapter';
import { failFromError } from './result-helpers';
import { SupabaseRepositoryBase } from './repository-base';

export class SupabaseClockRepository extends SupabaseRepositoryBase implements ClockRepository {
  async create(userId: string, data: CreateClockData): Promise<Result<Clock>> {
    return this.run(async () => {
      const filled = clampFilled(data.filled ?? 0, data.segments);
      const { data: row, error } = await this.db
        .from('clocks')
        .insert(toSupabaseClockInsert(data, userId, filled))
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseClock(row) };
    });
  }

  async findByGame(gameId: string): Promise<Result<Clock[]>> {
    return this.run(async () => {
      const { data: rows, error } = await this.db
        .from('clocks')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true });
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseClock) };
    });
  }

  async update(id: string, data: UpdateClockData): Promise<Result<Clock>> {
    return this.run(async () => {
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
        .update(
          toSupabaseClockUpdate(
            { ...data, ...(filled !== undefined ? { filled } : {}) },
            new Date().toISOString()
          )
        )
        .eq('id', id)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseClock(row) };
    });
  }

  async delete(id: string): Promise<Result<void>> {
    return this.run(async () => {
      const { error } = await this.db.from('clocks').delete().eq('id', id);
      if (error) return failFromError(error);
      return { success: true, data: undefined };
    });
  }
}
