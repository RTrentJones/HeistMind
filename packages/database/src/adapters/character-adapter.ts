// Type adapters for the Character entity (development/production schema).
import type { Tables, TablesInsert, TablesUpdate } from '../supabase-types';
import type {
  Character,
  CharacterData,
  CreateCharacterData,
  UpdateCharacterData,
  AdvancementRecord,
  CharacterStatus,
} from '../domain-types';
import { parseSupabaseDate, parseSupabaseJson, toJson } from './profile-adapter';

type CharacterRow = Tables<{ schema: 'development' }, 'characters'>;
type CharacterInsert = TablesInsert<{ schema: 'development' }, 'characters'>;
type CharacterUpdate = TablesUpdate<{ schema: 'development' }, 'characters'>;

export function fromSupabaseCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    createdBy: row.created_by,
    gameId: row.game_id,
    name: row.name,
    description: row.description,
    avatarUrl: row.avatar_url,
    characterData: parseSupabaseJson<CharacterData>(row.character_data, {} as CharacterData),
    playbookType: row.playbook_type,
    experiencePoints: row.experience_points ?? 0,
    advancementHistory: parseSupabaseJson<AdvancementRecord[]>(row.advancement_history, []),
    status: (row.status ?? 'active') as CharacterStatus,
    isTemplate: row.is_template ?? false,
    originalRulesetId: row.original_ruleset_id,
    adaptations: parseSupabaseJson<Record<string, unknown>>(row.adaptations, {}),
    createdAt: parseSupabaseDate(row.created_at),
    updatedAt: parseSupabaseDate(row.updated_at),
  };
}

export function toSupabaseCharacterInsert(
  data: CreateCharacterData,
  userId: string
): CharacterInsert {
  return {
    created_by: userId,
    // Standalone characters have no game (Phase 5); the ruleset binds via original_ruleset_id.
    game_id: data.gameId ?? null,
    original_ruleset_id: data.rulesetId ?? null,
    name: data.name,
    description: data.description ?? null,
    avatar_url: data.avatarUrl ?? null,
    character_data: toJson(data.characterData),
    playbook_type: data.playbookType,
  };
}

export function toSupabaseCharacterUpdate(data: UpdateCharacterData): CharacterUpdate {
  const update: CharacterUpdate = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.description !== undefined) update.description = data.description ?? null;
  if (data.avatarUrl !== undefined) update.avatar_url = data.avatarUrl ?? null;
  if (data.characterData !== undefined) update.character_data = toJson(data.characterData);
  if (data.experiencePoints !== undefined) update.experience_points = data.experiencePoints;
  if (data.status !== undefined) update.status = data.status;
  return update;
}
