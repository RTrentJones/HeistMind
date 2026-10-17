// The prod "coming soon" gate (holding page, no sign-in).
//
// Resolution order (see `resolveComingSoon`):
//   1. NEXT_PUBLIC_COMING_SOON — an explicit override, wins everywhere:
//        "1"/"true"/"on"  → gated,   "0"/"false"/"off" → un-gated (the launch switch).
//   2. Otherwise the gate follows Vercel's deployment environment:
//        production → gated;  preview (beta) / development / local → un-gated.
//
// The default is deliberately unchanged from the original gate: prod has no NEXT_PUBLIC_COMING_SOON
// set (RTrentJones.dev infra/heistmind.tf), so prod stays gated with no Vercel/Terraform change,
// and beta (a Vercel *preview* deployment) and local/CI stay un-gated with no config.
//
// This file ships on BOTH `development` and `main` — reverting it on `main` alone would just be
// undone by the next develop→main promote. To LAUNCH prod: set NEXT_PUBLIC_COMING_SOON=0 on the
// Vercel production target (one line in infra/heistmind.tf) and redeploy (NEXT_PUBLIC_ values are
// inlined at build). To take prod dark again, remove it (or set it to 1).
//
// NEXT_PUBLIC_* values are inlined into the server, edge-middleware and client bundles alike.
// VERCEL_ENV is runtime-only on the server/edge, so next.config.ts maps it to NEXT_PUBLIC_VERCEL_ENV
// for the client — the `??` keeps all three runtimes in agreement.
const ON = new Set(['1', 'true', 'on']);
const OFF = new Set(['0', 'false', 'off']);

/** Pure resolver (flag, Vercel env) → gated? — exported for unit tests. */
export function resolveComingSoon(
  flag: string | undefined,
  vercelEnv: string | undefined
): boolean {
  const normalized = flag?.trim().toLowerCase();
  if (normalized && ON.has(normalized)) return true;
  if (normalized && OFF.has(normalized)) return false;
  return vercelEnv === 'production';
}

export const COMING_SOON: boolean = resolveComingSoon(
  process.env.NEXT_PUBLIC_COMING_SOON,
  process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV
);

/**
 * While the gate is on, only the holding page, the public legal pages and /__version stay
 * reachable; every other route redirects to `/`. Pure (pathname → allowed?) so the middleware stays trivial and
 * this stays unit-testable. Legal pages remain live so the registered DMCA agent page and the
 * privacy policy are always reachable.
 */
export function isComingSoonAllowed(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/legal' ||
    pathname.startsWith('/legal/') ||
    // The deploy-identity endpoint (rewritten to /api/version): the verify gate must be able to
    // read prod's commit while the holding page is up. It serves only the public commit sha.
    pathname === '/__version'
  );
}
