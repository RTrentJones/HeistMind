// Type adapters for the Ruleset entity (development/production schema).
import type { Json, Tables, TablesInsert, TablesUpdate } from '../supabase-types';
import type {
  Ruleset,
  RulesetContent,
  CreateRulesetData,
  UpdateRulesetData,
  RulesetStatus,
} from '../domain-types';
import { parseSupabaseDate, parseSupabaseJson } from './profile-adapter';

type RulesetRow = Tables<{ schema: 'development' }, 'rulesets'>;
type RulesetInsert = TablesInsert<{ schema: 'development' }, 'rulesets'>;
type RulesetUpdate = TablesUpdate<{ schema: 'development' }, 'rulesets'>;

export function fromSupabaseRuleset(row: RulesetRow): Ruleset {
  return {
    id: row.id,
    createdBy: row.created_by,
    name: row.name,
    description: row.description,
    version: row.version,
    content: parseSupabaseJson<RulesetContent>(row.content, {} as RulesetContent),
    schemaVersion: row.schema_version,
    // The DB stores upload provenance as original_filename/file_size, not these URLs.
    sourceFileUrl: null,
    backupFileUrl: null,
    status: (row.status ?? 'draft') as RulesetStatus,
    isPublic: row.is_public ?? false,
    tags: row.tags ?? [],
    compatibilityFlags: parseSupabaseJson<Record<string, unknown>>(row.compatibility_flags, {}),
    createdAt: parseSupabaseDate(row.created_at),
    updatedAt: parseSupabaseDate(row.updated_at),
  };
}

export function toSupabaseRulesetInsert(data: CreateRulesetData, userId: string): RulesetInsert {
  return {
    created_by: userId,
    name: data.name,
    description: data.description ?? null,
    version: data.version,
    content: data.content as unknown as Json,
    is_public: data.isPublic ?? false,
    tags: data.tags ?? [],
    // schema_version + status fall back to DB defaults ('1.0' / 'draft').
  };
}

export function toSupabaseRulesetUpdate(data: UpdateRulesetData): RulesetUpdate {
  const update: RulesetUpdate = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.description !== undefined) update.description = data.description ?? null;
  if (data.version !== undefined) update.version = data.version;
  if (data.content !== undefined) update.content = data.content as unknown as Json;
  if (data.status !== undefined) update.status = data.status;
  if (data.isPublic !== undefined) update.is_public = data.isPublic;
  if (data.tags !== undefined) update.tags = data.tags;
  return update;
}
