// Supabase RulesetRepository — queries the env schema via client.schema().
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import type {
  Ruleset,
  CreateRulesetData,
  RulesetWithDetails,
  PaginatedResult,
  Result,
} from '../domain-types';
import type { RulesetRepository } from '../repositories';
import type { UpdateRulesetData } from '../domain-types';
import {
  fromSupabaseRuleset,
  toSupabaseRulesetInsert,
  toSupabaseRulesetUpdate,
} from '../adapters/ruleset-adapter';
import { failFromError, failFromCatch, NO_ROWS, type CoreSchema } from './result-helpers';

export class SupabaseRulesetRepository implements RulesetRepository {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly schema: CoreSchema
  ) {}

  // Cast to the development schema (the only one with generated table types;
  // production is created empty until that env is deployed).
  private get db() {
    return this.client.schema(this.schema as 'development');
  }

  async create(userId: string, data: CreateRulesetData): Promise<Result<Ruleset>> {
    try {
      const { data: row, error } = await this.db
        .from('rulesets')
        .insert(toSupabaseRulesetInsert(data, userId))
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseRuleset(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async findById(id: string): Promise<Result<Ruleset | null>> {
    try {
      const { data: row, error } = await this.db.from('rulesets').select('*').eq('id', id).single();
      if (error) {
        if (error.code === NO_ROWS) return { success: true, data: null };
        return failFromError(error);
      }
      return { success: true, data: fromSupabaseRuleset(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async findByCreator(userId: string): Promise<Result<Ruleset[]>> {
    try {
      const { data: rows, error } = await this.db
        .from('rulesets')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseRuleset) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  // --- Outside the journey scope ---
  async findPublic(): Promise<Result<PaginatedResult<Ruleset>>> {
    throw new Error('SupabaseRulesetRepository.findPublic not implemented');
  }
  async findWithDetails(): Promise<Result<RulesetWithDetails | null>> {
    throw new Error('SupabaseRulesetRepository.findWithDetails not implemented');
  }
  // Update a ruleset's mutable fields (used to refresh a stale starter to the latest content).
  // RLS (`rulesets_update_policy`) restricts this to the owner; `_userId` is kept for the interface.
  async update(id: string, _userId: string, data: UpdateRulesetData): Promise<Result<Ruleset>> {
    try {
      const { data: row, error } = await this.db
        .from('rulesets')
        .update(toSupabaseRulesetUpdate(data))
        .eq('id', id)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseRuleset(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }
  async delete(): Promise<Result<void>> {
    throw new Error('SupabaseRulesetRepository.delete not implemented');
  }
  async searchByTags(): Promise<Result<Ruleset[]>> {
    throw new Error('SupabaseRulesetRepository.searchByTags not implemented');
  }
  async checkUsage(): Promise<Result<{ isUsed: boolean; gameCount: number }>> {
    throw new Error('SupabaseRulesetRepository.checkUsage not implemented');
  }
}
