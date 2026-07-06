// The prod "coming soon" gate.
//
// Ships DEFAULT-OFF: `NEXT_PUBLIC_COMING_SOON` is unset on beta, preview, and locally, so this
// changes nothing there. Set `NEXT_PUBLIC_COMING_SOON=1` in the Vercel *Production* environment
// only (then redeploy prod) to put prod behind a holding page and block sign-in while beta is
// polished; delete the var + redeploy to go live — no code change either way. NEXT_PUBLIC_ so the
// value is inlined into the middleware, server, and client bundles at build time.
export const COMING_SOON = process.env.NEXT_PUBLIC_COMING_SOON === '1';

/**
 * While the gate is on, only the holding page and the public legal pages stay reachable; every
 * other route redirects to `/`. Pure (pathname → allowed?) so the middleware stays trivial and
 * this stays unit-testable. Legal pages remain live so the registered DMCA agent page and the
 * privacy policy are always reachable.
 */
export function isComingSoonAllowed(pathname: string): boolean {
  return pathname === '/' || pathname === '/legal' || pathname.startsWith('/legal/');
}
