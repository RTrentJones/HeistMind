// Supabase implementation of ProfileRepository.
// Profiles live in the `public` schema (created by the on-signup DB trigger), so this repo talks to
// the client directly instead of through the env-scoped `coreSchema` accessor the other repos use.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import type { Profile, UpdateProfileData, Result } from '@heist-mind/core';
import type { ProfileRepository } from '../repositories';
import { fromSupabaseProfile, toSupabaseProfileUpdate } from '../adapters/profile-adapter';
import { failFromError, NO_ROWS, tryResult } from './result-helpers';

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(id: string): Promise<Result<Profile | null>> {
    return tryResult(async () => {
      const { data: row, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === NO_ROWS) return { success: true, data: null };
        return failFromError(error);
      }
      return { success: true, data: fromSupabaseProfile(row) };
    });
  }

  async findByUsername(username: string): Promise<Result<Profile | null>> {
    return tryResult(async () => {
      const { data: row, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();
      if (error) {
        if (error.code === NO_ROWS) return { success: true, data: null };
        return failFromError(error);
      }
      return { success: true, data: fromSupabaseProfile(row) };
    });
  }

  async update(id: string, data: UpdateProfileData): Promise<Result<Profile>> {
    return tryResult(async () => {
      const { data: row, error } = await this.client
        .from('profiles')
        .update(toSupabaseProfileUpdate(data))
        .eq('id', id)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseProfile(row) };
    });
  }

  async delete(id: string): Promise<Result<void>> {
    return tryResult(async () => {
      const { error } = await this.client.from('profiles').delete().eq('id', id);
      if (error) return failFromError(error);
      return { success: true, data: undefined };
    });
  }
}
