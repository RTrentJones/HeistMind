// Centralized env resolution for the E2E harness.
// The suite runs in three contexts with different amounts of backend access:
//   1. CI with a local Supabase stack (full: public + service-role keys)
//   2. Greenlight deploy gate against beta/prod (public app always; admin auth only
//      when the env's service-role key is provided as a CI secret)
//   3. A developer's machine pointed at any running app
// Specs gate themselves on these flags so the suite stays green on the public surface
// even when admin credentials are absent — mirroring verify/heistmind.config.ts, which
// stays green on the api check alone when ANTHROPIC_API_KEY is missing.

export interface E2EEnv {
  /** Origin the app is served from, e.g. http://localhost:3000 or https://beta.heistmind.app */
  baseURL: string;
  /** Supabase REST/Auth URL the running app talks to (for admin user provisioning). */
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  /** Service-role key — required to mint test users without the Discord consent screen. */
  supabaseServiceRoleKey?: string;
  /** Vercel Deployment Protection bypass, needed to reach protected preview/beta deploys. */
  vercelBypass?: string;
}

export function getE2EEnv(): E2EEnv {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

  return {
    baseURL,
    supabaseUrl: process.env.E2E_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.E2E_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    vercelBypass: process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
  };
}

/** True when we can provision/inject authenticated users (service-role + public keys present). */
export function hasAdminAuth(env: E2EEnv = getE2EEnv()): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceRoleKey);
}
