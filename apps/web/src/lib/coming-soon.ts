// The prod "coming soon" gate — ON in the production deployment only, automatically.
//
// This lives ONLY on `main` (prod); it is deliberately NOT on `development`, so beta never shows
// the holding page. It keys on Vercel's deployment environment, so it needs NO env var to be set:
//   - production deployment → gated (holding page, no login)
//   - preview / beta / local → un-gated (the real app), so their e2e suites exercise it normally.
//
// VERCEL_ENV is read at runtime on the server/edge; NEXT_PUBLIC_VERCEL_ENV is inlined for the
// client (mapped from VERCEL_ENV in next.config.ts) — the `??` keeps all three runtimes in sync.
// To bring prod online for real, revert this commit on `main`.
export const COMING_SOON: boolean =
  (process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV) === 'production';

/**
 * While the gate is on, only the holding page and the public legal pages stay reachable; every
 * other route redirects to `/`. Pure (pathname → allowed?) so the middleware stays trivial and
 * this stays unit-testable. Legal pages remain live so the registered DMCA agent page and the
 * privacy policy are always reachable.
 */
export function isComingSoonAllowed(pathname: string): boolean {
  return pathname === '/' || pathname === '/legal' || pathname.startsWith('/legal/');
}
