// Type adapters for the Game entity (development/production schema).
import type { Json, Tables, TablesInsert, TablesUpdate } from '../supabase-types';
import type { Game, CreateGameData, UpdateGameData, GameState } from '../domain-types';
import { parseSupabaseDate, parseSupabaseJson } from './profile-adapter';

type GameRow = Tables<{ schema: 'development' }, 'games'>;
type GameInsert = TablesInsert<{ schema: 'development' }, 'games'>;
type GameUpdate = TablesUpdate<{ schema: 'development' }, 'games'>;

export function fromSupabaseGame(row: GameRow): Game {
  return {
    id: row.id,
    createdBy: row.created_by,
    rulesetId: row.ruleset_id,
    name: row.name,
    description: row.description,
    state: (row.state ?? 'draft') as GameState,
    maxPlayers: row.max_players ?? 6,
    currentPlayers: row.current_players ?? 0,
    allowCoGMs: row.allow_co_gms ?? false,
    allowSpectators: row.allow_spectators ?? false,
    ruleOverrides: parseSupabaseJson<Record<string, unknown>>(row.rule_overrides, {}),
    houseRules: row.house_rules,
    inviteOnly: row.invite_only ?? true,
    publicListing: row.public_listing ?? false,
    createdAt: parseSupabaseDate(row.created_at),
    updatedAt: parseSupabaseDate(row.updated_at),
  };
}

export function toSupabaseGameInsert(data: CreateGameData, userId: string): GameInsert {
  return {
    created_by: userId,
    ruleset_id: data.rulesetId,
    name: data.name,
    description: data.description ?? null,
    max_players: data.maxPlayers ?? 6,
    allow_co_gms: data.allowCoGMs ?? false,
    allow_spectators: data.allowSpectators ?? false,
    invite_only: data.inviteOnly ?? true,
    public_listing: data.publicListing ?? false,
    house_rules: data.houseRules ?? null,
  };
}

export function toSupabaseGameUpdate(data: UpdateGameData): GameUpdate {
  const update: GameUpdate = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.description !== undefined) update.description = data.description ?? null;
  if (data.state !== undefined) update.state = data.state;
  if (data.maxPlayers !== undefined) update.max_players = data.maxPlayers;
  if (data.allowCoGMs !== undefined) update.allow_co_gms = data.allowCoGMs;
  if (data.allowSpectators !== undefined) update.allow_spectators = data.allowSpectators;
  if (data.ruleOverrides !== undefined)
    update.rule_overrides = data.ruleOverrides as unknown as Json;
  if (data.houseRules !== undefined) update.house_rules = data.houseRules ?? null;
  if (data.inviteOnly !== undefined) update.invite_only = data.inviteOnly;
  if (data.publicListing !== undefined) update.public_listing = data.publicListing;
  return update;
}
