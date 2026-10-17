import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Write a mutation's RETURNED row into a cached list (by id) before the confirming refetch.
 * Increment-style controls (clock ticks, faction tier/status, crew steppers) compute their next
 * value from the cache, so without this a quick second click — the button re-enables as soon as the
 * mutation settles — would compute from the pre-write value and swallow a tick (review item 3).
 */
export function replaceInList<T extends { id: string }>(
  qc: QueryClient,
  queryKey: QueryKey,
  row: T
): void {
  qc.setQueryData<T[]>(queryKey, old => old?.map(item => (item.id === row.id ? row : item)));
}

/** Drop a deleted row from a cached list (by id) so it disappears before the refetch lands. */
export function removeFromList<T extends { id: string }>(
  qc: QueryClient,
  queryKey: QueryKey,
  id: string
): void {
  qc.setQueryData<T[]>(queryKey, old => old?.filter(item => item.id !== id));
}
