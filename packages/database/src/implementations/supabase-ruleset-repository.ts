// Supabase RulesetRepository — queries the env schema via client.schema().
import type { Ruleset, CreateRulesetData, Result } from '../domain-types';
import type { RulesetRepository } from '../repositories';
import type { UpdateRulesetData } from '../domain-types';
import {
  fromSupabaseRuleset,
  toSupabaseRulesetInsert,
  toSupabaseRulesetUpdate,
} from '../adapters/ruleset-adapter';
import { failFromError, NO_ROWS } from './result-helpers';
import { SupabaseRepositoryBase } from './repository-base';

export class SupabaseRulesetRepository extends SupabaseRepositoryBase implements RulesetRepository {
  async create(userId: string, data: CreateRulesetData): Promise<Result<Ruleset>> {
    return this.run(async () => {
      const { data: row, error } = await this.db
        .from('rulesets')
        .insert(toSupabaseRulesetInsert(data, userId))
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseRuleset(row) };
    });
  }

  async findById(id: string): Promise<Result<Ruleset | null>> {
    return this.run(async () => {
      const { data: row, error } = await this.db.from('rulesets').select('*').eq('id', id).single();
      if (error) {
        if (error.code === NO_ROWS) return { success: true, data: null };
        return failFromError(error);
      }
      return { success: true, data: fromSupabaseRuleset(row) };
    });
  }

  async findByCreator(userId: string): Promise<Result<Ruleset[]>> {
    return this.run(async () => {
      const { data: rows, error } = await this.db
        .from('rulesets')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseRuleset) };
    });
  }

  // Update a ruleset's mutable fields (used to refresh a stale starter to the latest content).
  // RLS (`rulesets_update_policy`) restricts this to the owner; `_userId` is kept for the interface.
  async update(id: string, _userId: string, data: UpdateRulesetData): Promise<Result<Ruleset>> {
    return this.run(async () => {
      const { data: row, error } = await this.db
        .from('rulesets')
        .update(toSupabaseRulesetUpdate(data))
        .eq('id', id)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseRuleset(row) };
    });
  }
}
