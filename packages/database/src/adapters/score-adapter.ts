// Type adapters for the Score entity (development/production schema).
import type { Tables, TablesInsert, TablesUpdate } from '../supabase-types';
import type { Score, CreateScoreData, UpdateScoreData, ScoreStatus } from '../domain-types';
import { parseSupabaseDate } from './profile-adapter';

type ScoreRow = Tables<{ schema: 'development' }, 'scores'>;
type ScoreInsert = TablesInsert<{ schema: 'development' }, 'scores'>;
type ScoreUpdate = TablesUpdate<{ schema: 'development' }, 'scores'>;

/** Normalize the free-text status column to the known set (defaults to 'active'). */
function asStatus(value: string): ScoreStatus {
  return value === 'completed' ? 'completed' : 'active';
}

export function fromSupabaseScore(row: ScoreRow): Score {
  return {
    id: row.id,
    gameId: row.game_id,
    name: row.name ?? null,
    status: asStatus(row.status),
    notes: row.notes ?? null,
    // started_at/ended_at are genuinely nullable — preserve null rather than defaulting to now.
    startedAt: row.started_at ? parseSupabaseDate(row.started_at) : null,
    endedAt: row.ended_at ? parseSupabaseDate(row.ended_at) : null,
    createdBy: row.created_by ?? null,
    createdAt: parseSupabaseDate(row.created_at),
    updatedAt: parseSupabaseDate(row.updated_at),
  };
}

export function toSupabaseScoreInsert(data: CreateScoreData, userId: string): ScoreInsert {
  return {
    game_id: data.gameId,
    name: data.name ?? null,
    notes: data.notes ?? null,
    status: 'active',
    created_by: userId,
  };
}

export function toSupabaseScoreUpdate(data: UpdateScoreData, nowIso: string): ScoreUpdate {
  const update: ScoreUpdate = { updated_at: nowIso };
  if (data.name !== undefined) update.name = data.name;
  if (data.notes !== undefined) update.notes = data.notes;
  if (data.status !== undefined) {
    update.status = data.status;
    // Stamp the wrap time when a score completes.
    if (data.status === 'completed') update.ended_at = nowIso;
  }
  return update;
}
