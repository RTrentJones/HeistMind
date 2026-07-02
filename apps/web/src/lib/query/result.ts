import type { Result } from '@heist-mind/database';

/**
 * Error thrown by `unwrap` — preserves the repository error code (e.g. Postgres `23505` unique
 * violations) so components can map specific failures to friendly copy after React Query surfaces it.
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    readonly code?: string
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * Unwrap a repository `Result<T>` for use inside a React Query `queryFn`/`mutationFn`: return the
 * data on success, **throw** on failure so React Query routes it to `error` state. This is the only
 * place the `Result` envelope is collapsed — the per-concept `features/{concept}/data/` hooks call
 * it, and components see plain `data`/`error` from React Query.
 */
export function unwrap<T>(result: Result<T>): T {
  if (!result.success) {
    throw new RepositoryError(result.error?.message ?? 'Request failed', result.error?.code);
  }
  return result.data;
}

/** The error code from an `unwrap`-thrown error, if any (narrowing helper for catch blocks). */
export function errorCode(err: unknown): string | undefined {
  return err instanceof RepositoryError ? err.code : undefined;
}

/** The human message from a caught unknown, or '' (callers append their own translated fallback). */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '';
}
