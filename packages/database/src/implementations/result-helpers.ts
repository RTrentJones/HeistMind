// Shared Result helpers for Supabase repository implementations.
import type { Result } from '../domain-types';

/**
 * The env-scoped schema the core tables (rulesets/games/characters/game_players)
 * live in. `profiles` stays in `public`. Defaults to 'development' per the
 * migration's `heistmind.target_schema`.
 */
export type CoreSchema = 'development' | 'production';

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
