/**
 * Generate a client-side id for rows the app inserts (e.g. advancement-history entries) where the
 * DB doesn't mint one. Prefers the platform UUID; falls back to a time+random token where
 * `crypto.randomUUID` is unavailable.
 */
export function newId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `adv-${Date.now()}-${Math.round(Math.random() * 1e9)}`
  );
}
