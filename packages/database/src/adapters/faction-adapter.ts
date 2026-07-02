// Type adapters for the Faction entity (development/production schema).
import type { Tables, TablesInsert, TablesUpdate } from '../supabase-types';
import type { Faction, CreateFactionData, UpdateFactionData } from '@heist-mind/core';
import { clampFactionTier, clampFactionStatus } from '@heist-mind/core';
import { parseSupabaseDate } from './profile-adapter';

type FactionRow = Tables<{ schema: 'development' }, 'factions'>;
type FactionInsert = TablesInsert<{ schema: 'development' }, 'factions'>;
type FactionUpdate = TablesUpdate<{ schema: 'development' }, 'factions'>;

export function fromSupabaseFaction(row: FactionRow): Faction {
  return {
    id: row.id,
    gameId: row.game_id,
    name: row.name,
    factionType: row.faction_type ?? null,
    tier: row.tier ?? 0,
    status: row.status ?? 0,
    notes: row.notes ?? null,
    createdBy: row.created_by ?? null,
    createdAt: parseSupabaseDate(row.created_at),
    updatedAt: parseSupabaseDate(row.updated_at),
  };
}

export function toSupabaseFactionInsert(data: CreateFactionData, userId: string): FactionInsert {
  return {
    game_id: data.gameId,
    name: data.name,
    faction_type: data.factionType ?? null,
    tier: clampFactionTier(data.tier ?? 0),
    status: clampFactionStatus(data.status ?? 0),
    created_by: userId,
  };
}

/** Build the UPDATE payload, clamping tier/status through the pure faction bounds. */
export function toSupabaseFactionUpdate(data: UpdateFactionData, nowIso: string): FactionUpdate {
  const update: FactionUpdate = { updated_at: nowIso };
  if (data.name !== undefined) update.name = data.name;
  if (data.factionType !== undefined) update.faction_type = data.factionType;
  if (data.tier !== undefined) update.tier = clampFactionTier(data.tier);
  if (data.status !== undefined) update.status = clampFactionStatus(data.status);
  if (data.notes !== undefined) update.notes = data.notes;
  return update;
}
