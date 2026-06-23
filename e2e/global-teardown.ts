// Runs once after the suite. Deletes the deterministic personas global-setup provisioned, so the
// test accounts never persist in the project-global `auth.users` (shared by the schema-per-env
// beta/prod). Best-effort + idempotent; no-op when admin creds are absent (nothing was provisioned).

import type { FullConfig } from '@playwright/test';
import { getE2EEnv, hasAdminAuth } from './support/env';
import { cleanupTestUsers } from './support/supabase-admin';

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  const env = getE2EEnv();
  if (!hasAdminAuth(env)) return;
  await cleanupTestUsers(env);
  // eslint-disable-next-line no-console
  console.log('[e2e] Cleaned up test personas from auth.users.');
}
