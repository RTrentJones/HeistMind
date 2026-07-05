// Type adapters for the Roll entity (development/production schema).
import type { Tables, TablesInsert } from '../supabase-types';
import type { Roll, CreateRollData } from '@heist-mind/core';
import type { RollKind, RollOutcome } from '@heist-mind/core';
import { parseSupabaseDate, parseSupabaseJson } from './profile-adapter';

type RollRow = Tables<{ schema: 'development' }, 'rolls'>;
type RollInsert = TablesInsert<{ schema: 'development' }, 'rolls'>;

export function fromSupabaseRoll(row: RollRow): Roll {
  return {
    id: row.id,
    gameId: row.game_id,
    characterId: row.character_id ?? null,
    userId: row.user_id,
    kind: (row.kind as RollKind) ?? 'action',
    label: row.label ?? null,
    dice: row.dice ?? 0,
    // Persisted since 00020 (audit P2) — a rating-0 pool rolls 2 dice take-lowest, so `dice`
    // alone can't signal the zero-dice rule to display-time recomputes.
    zeroDice: row.zero_dice ?? false,
    results: parseSupabaseJson<number[]>(row.results, []),
    outcome: (row.outcome as RollOutcome) ?? 'bad',
    position: row.position ?? null,
    effect: row.effect ?? null,
    note: row.note ?? null,
    scoreId: row.score_id ?? null,
    createdAt: parseSupabaseDate(row.created_at),
  };
}

export function toSupabaseRollInsert(
  data: CreateRollData,
  userId: string,
  outcome: RollOutcome,
  scoreId: string | null
): RollInsert {
  return {
    game_id: data.gameId,
    character_id: data.characterId ?? null,
    user_id: userId,
    kind: data.kind,
    label: data.label ?? null,
    dice: data.dice,
    zero_dice: data.zeroDice ?? false,
    results: data.results,
    outcome,
    position: data.position ?? null,
    effect: data.effect ?? null,
    note: data.note ?? null,
    score_id: scoreId,
  };
}
