// Shared Result helpers for Supabase repository implementations.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Result } from '@heist-mind/core';
import type { Database } from '../supabase-types';

/**
 * The env-scoped schema the core tables (rulesets/games/characters/game_players)
 * live in. `profiles` stays in `public`. Defaults to 'development' per the
 * migration's `heistmind.target_schema`.
 */
export type CoreSchema = 'development' | 'production';

/** A PostgREST client scoped to one of the generated schemas. */
export type CoreDb = ReturnType<SupabaseClient<Database>['schema']>;

/**
 * A PostgREST client scoped to the env's core schema. The generated `Database` type only carries the
 * active schema ('development'), so the runtime schema name is cast here — in exactly one place —
 * rather than at every repository call site. The explicit return type keeps tsc from inlining a
 * non-portable postgrest-js path into the emitted declarations.
 */
export function coreSchema(client: SupabaseClient<Database>, schema: CoreSchema): CoreDb {
  return client.schema(schema as 'development');
}

interface SupabaseishError {
  message: string;
  code?: string;
  details?: string;
}

/** Map a Supabase/PostgREST error into a failed Result. */
export function failFromError<T>(error: SupabaseishError): Result<T> {
  return {
    success: false,
    error: { message: error.message, code: error.code, details: error.details },
  };
}

/** Map a thrown exception into a failed Result. */
export function failFromCatch<T>(e: unknown): Result<T> {
  return {
    success: false,
    error: {
      message: e instanceof Error ? e.message : 'Unknown error',
      code: 'UNKNOWN_ERROR',
    },
  };
}

/** PostgREST "no rows" code from `.single()`. */
export const NO_ROWS = 'PGRST116';

/**
 * Run a repository operation, mapping any thrown exception into a failed Result. The one
 * try/catch for the whole data layer — method bodies return a Result themselves (using
 * `failFromError` for PostgREST errors) and let this wrapper absorb throws.
 */
export async function tryResult<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await fn();
  } catch (e) {
    return failFromCatch(e);
  }
}
