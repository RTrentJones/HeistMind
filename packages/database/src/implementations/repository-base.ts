// Shared plumbing for the env-schema Supabase repositories.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import type { Result } from '@heist-mind/core';
import {
  coreSchema,
  failFromError,
  tryResult,
  type CoreDb,
  type CoreSchema,
} from './result-helpers';

type DeletableTable = 'characters' | 'games' | 'rulesets';

/** An RPC the generated DB types don't know yet (added by a later migration). */
export type UntypedRpc = (
  fn: string,
  args: Record<string, unknown>
) => Promise<{
  data: unknown;
  error: { message: string; code?: string; details?: string } | null;
}>;

/**
 * Base class for repositories over the env-scoped core schema: holds the client/schema pair,
 * exposes the schema-scoped `db` accessor, and `run()` — the single try/catch wrapper (via
 * `tryResult`) so method bodies contain only the query + Result mapping, never error plumbing.
 * (`SupabaseProfileRepository` doesn't extend this: profiles live in `public`, so it uses the
 * client directly with `tryResult`.)
 */
export abstract class SupabaseRepositoryBase {
  constructor(
    protected readonly client: SupabaseClient<Database>,
    protected readonly schema: CoreSchema
  ) {}

  // Explicit return type so tsc doesn't inline a non-portable postgrest-js path into declarations.
  protected get db(): CoreDb {
    return coreSchema(this.client, this.schema);
  }

  /** Call an env-schema RPC that isn't in the generated types (through a narrow cast). */
  protected get rpcUntyped(): UntypedRpc {
    const db = this.db as unknown as { rpc: UntypedRpc };
    return (fn, args) => db.rpc(fn, args);
  }

  /**
   * Delete one row by id under RLS. A DELETE that RLS filters out matches zero rows and returns
   * NO error, so ask for the deleted id back: zero rows → NOT_FOUND (missing, or not yours).
   * FK blocks (e.g. a ruleset still used by a campaign) surface as the PostgREST 23503.
   */
  protected deleteById(table: DeletableTable, id: string): Promise<Result<void>> {
    return this.run(async () => {
      const { data: rows, error } = await this.db.from(table).delete().eq('id', id).select('id');
      if (error) return failFromError(error);
      if (!rows || rows.length === 0) {
        return {
          success: false,
          error: { message: 'Not found, or you can’t delete it', code: 'NOT_FOUND' },
        };
      }
      return { success: true, data: undefined };
    });
  }

  /** Run a repository operation, mapping any thrown exception into a failed Result. */
  protected run<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
    return tryResult(fn);
  }
}
