// SERVER-ONLY service-role repository wiring — the second (and last) factory site next to the
// browser client in ./index. Used by the Discord interactions route: a slash command has no user
// session, so the bot acts through the service role and MUST run @heist-mind/discord's authz
// prelude before any read/write (service role bypasses RLS).
import { createDatabaseProvider, type DatabaseRepositories } from '@heist-mind/database';

/**
 * Build service-role repositories for one request. Null when the deployment has no service-role
 * creds (creds-guarded — the bot's account features phrase "not configured", the rest still works).
 * Never import this from client code: the service key must not reach a browser bundle.
 */
export function createServiceRepositories(): DatabaseRepositories | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createDatabaseProvider({
    provider: 'supabase',
    supabase: { url, key: serviceKey },
  }).createRepositories();
}
