import type { Result } from '@heist-mind/database';

/**
 * Unwrap a repository `Result<T>` for use inside a React Query `queryFn`/`mutationFn`: return the
 * data on success, **throw** on failure so React Query routes it to `error` state. This is the only
 * place the `Result` envelope is collapsed — the per-concept `features/{concept}/data/` hooks call
 * it, and components see plain `data`/`error` from React Query.
 */
export function unwrap<T>(result: Result<T>): T {
  if (!result.success) {
    throw new Error(result.error?.message ?? 'Request failed');
  }
  return result.data;
}
