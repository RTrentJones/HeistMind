// Type adapters for the Crew entity (development/production schema).
import type { Tables, TablesInsert, TablesUpdate } from '../supabase-types';
import type { Crew, CreateCrewData, UpdateCrewData } from '../domain-types';
import { clampCrewStat, clampNonNegative, normalizeHold } from '../crews';
import { parseSupabaseDate } from './profile-adapter';

type CrewRow = Tables<{ schema: 'development' }, 'crews'>;
type CrewInsert = TablesInsert<{ schema: 'development' }, 'crews'>;
type CrewUpdate = TablesUpdate<{ schema: 'development' }, 'crews'>;

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/** A pool-id → numeric-value map; ignores any non-numeric entries from older/hand-edited rows. */
function asNumberRecord(value: unknown): Record<string, number> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

export function fromSupabaseCrew(row: CrewRow): Crew {
  return {
    id: row.id,
    gameId: row.game_id,
    name: row.name ?? null,
    crewType: row.crew_type ?? null,
    tier: row.tier ?? 0,
    rep: row.rep ?? 0,
    heat: row.heat ?? 0,
    wanted: row.wanted ?? 0,
    hold: normalizeHold(row.hold),
    coin: row.coin ?? 0,
    vault: row.vault ?? 0,
    crewAbilities: (row.crew_abilities as string[] | null) ?? [],
    claims: asStringArray(row.claims),
    cohorts: asStringArray(row.cohorts),
    resources: asNumberRecord(row.resources),
    createdBy: row.created_by ?? null,
    createdAt: parseSupabaseDate(row.created_at),
    updatedAt: parseSupabaseDate(row.updated_at),
  };
}

export function toSupabaseCrewInsert(data: CreateCrewData, userId: string): CrewInsert {
  return {
    game_id: data.gameId,
    name: data.name ?? null,
    crew_type: data.crewType ?? null,
    created_by: userId,
  };
}

/** Build the UPDATE payload, clamping every stat through the pure crew bounds. */
export function toSupabaseCrewUpdate(data: UpdateCrewData, nowIso: string): CrewUpdate {
  const update: CrewUpdate = { updated_at: nowIso };
  if (data.name !== undefined) update.name = data.name;
  if (data.crewType !== undefined) update.crew_type = data.crewType;
  if (data.tier !== undefined) update.tier = clampCrewStat('tier', data.tier);
  if (data.heat !== undefined) update.heat = clampCrewStat('heat', data.heat);
  if (data.wanted !== undefined) update.wanted = clampCrewStat('wanted', data.wanted);
  if (data.rep !== undefined) update.rep = clampNonNegative(data.rep);
  if (data.coin !== undefined) update.coin = clampNonNegative(data.coin);
  if (data.vault !== undefined) update.vault = clampNonNegative(data.vault);
  if (data.hold !== undefined) update.hold = normalizeHold(data.hold);
  if (data.crewAbilities !== undefined) update.crew_abilities = data.crewAbilities;
  if (data.claims !== undefined) update.claims = data.claims;
  if (data.cohorts !== undefined) update.cohorts = data.cohorts;
  if (data.resources !== undefined) update.resources = data.resources;
  return update;
}
