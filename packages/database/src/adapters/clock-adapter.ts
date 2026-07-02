// Type adapters for the Clock entity (development/production schema).
import type { Tables, TablesInsert, TablesUpdate } from '../supabase-types';
import type { Clock, CreateClockData, ClockSegments } from '@heist-mind/core';
import { parseSupabaseDate } from './profile-adapter';

type ClockRow = Tables<{ schema: 'development' }, 'clocks'>;
type ClockInsert = TablesInsert<{ schema: 'development' }, 'clocks'>;
type ClockUpdate = TablesUpdate<{ schema: 'development' }, 'clocks'>;

export function fromSupabaseClock(row: ClockRow): Clock {
  return {
    id: row.id,
    gameId: row.game_id,
    name: row.name,
    segments: (row.segments as ClockSegments) ?? 4,
    filled: row.filled ?? 0,
    linkedType: row.linked_type ?? null,
    linkedId: row.linked_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: parseSupabaseDate(row.created_at),
    updatedAt: parseSupabaseDate(row.updated_at),
  };
}

export function toSupabaseClockInsert(
  data: CreateClockData,
  userId: string,
  filled: number
): ClockInsert {
  return {
    game_id: data.gameId,
    name: data.name,
    segments: data.segments,
    filled,
    linked_type: data.linkedType ?? null,
    linked_id: data.linkedId ?? null,
    created_by: userId,
  };
}

/** Build the UPDATE payload, stamping `updated_at`. `filled` is pre-clamped by the repository. */
export function toSupabaseClockUpdate(
  fields: { name?: string; segments?: ClockSegments; filled?: number },
  nowIso: string
): ClockUpdate {
  const update: ClockUpdate = { updated_at: nowIso };
  if (fields.name !== undefined) update.name = fields.name;
  if (fields.segments !== undefined) update.segments = fields.segments;
  if (fields.filled !== undefined) update.filled = fields.filled;
  return update;
}
