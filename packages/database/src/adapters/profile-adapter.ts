// Type adapters for Profile entity
// Transforms between Supabase database types and clean domain types

import type { Tables, TablesInsert, TablesUpdate, Json } from '../supabase-types';
import type { Profile, UpdateProfileData } from '../domain-types';

// Supabase type aliases for cleaner code
type ProfileRow = Tables<'profiles'>;
type ProfileUpdate = TablesUpdate<'profiles'>;

/**
 * Transform Supabase profile row to domain Profile entity
 */
export function fromSupabaseProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.username, // Map username to displayName for now
    avatarUrl: row.avatar_url,
    preferences: {}, // Default empty preferences for now
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

/**
 * Transform domain UpdateProfileData to Supabase update format
 */
export function toSupabaseProfileUpdate(data: UpdateProfileData): ProfileUpdate {
  return {
    username: data.username,
    avatar_url: data.avatarUrl || null,
    // Note: updated_at will be handled by trigger
  };
}

/**
 * Helper to safely parse dates from Supabase
 */
export function parseSupabaseDate(dateString: string | null): Date {
  if (!dateString) return new Date();
  return new Date(dateString);
}

/**
 * Helper to safely parse JSON fields from Supabase
 */
export function parseSupabaseJson<T>(jsonValue: unknown, defaultValue: T): T {
  if (jsonValue === null || jsonValue === undefined) {
    return defaultValue;
  }

  try {
    // If it's already parsed, return it
    if (typeof jsonValue === 'object') {
      return jsonValue as T;
    }

    // If it's a string, parse it
    if (typeof jsonValue === 'string') {
      return JSON.parse(jsonValue) as T;
    }

    return defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Narrow a domain value into the Supabase `Json` column type for a write. These JSONB columns are
 * stored verbatim and re-hydrated on read via `parseSupabaseJson`, so the structural cast is safe;
 * centralizing it here keeps the `as unknown as Json` workaround out of every adapter/repository.
 */
export function toJson(value: unknown): Json {
  return value as Json;
}
