// Shared plumbing for the env-schema Supabase repositories.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import type { Result } from '../domain-types';
import { coreSchema, tryResult, type CoreDb, type CoreSchema } from './result-helpers';

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

  /** Run a repository operation, mapping any thrown exception into a failed Result. */
  protected run<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
    return tryResult(fn);
  }
}
