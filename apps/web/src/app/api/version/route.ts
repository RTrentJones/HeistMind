// Deploy identity for the Greenlight verify gate: the commit this deployment was built from.
// The gate compares it to the sha CI just shipped, so a stale deployment (or an alias still
// pointing at the previous build) can't pass as the new one. Served at /__version via the
// next.config rewrite. Vercel exposes VERCEL_GIT_COMMIT_SHA at runtime; local/other builds
// report null rather than inventing an identity. A commit sha is public in this repo, so the
// route is unauthenticated.
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json(
    { sha: process.env.VERCEL_GIT_COMMIT_SHA || null },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
