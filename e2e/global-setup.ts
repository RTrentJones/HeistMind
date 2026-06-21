// Runs once before the suite. When admin credentials are available it provisions the
// deterministic personas and writes their injected-session storageState files. When they
// aren't (e.g. a deploy gate without the env's service-role secret), it no-ops — the
// auth-gated specs detect the missing storageState and skip, so the public surface still runs.

import { mkdir, writeFile } from 'node:fs/promises';
import type { FullConfig } from '@playwright/test';
import { getE2EEnv, hasAdminAuth } from './support/env';
import { ensureTestUser, TEST_USERS } from './support/supabase-admin';
import { buildStorageState } from './support/storage-state';
import { AUTH_DIR, storageStatePath } from './support/paths';

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const env = getE2EEnv();

  if (!hasAdminAuth(env)) {
    // eslint-disable-next-line no-console
    console.warn(
      '[e2e] No Supabase service-role key — skipping authenticated-session provisioning. ' +
        'Public specs will run; auth-gated specs will be skipped.'
    );
    return;
  }

  await mkdir(AUTH_DIR, { recursive: true });

  for (const [persona, user] of Object.entries(TEST_USERS)) {
    const provisioned = await ensureTestUser(env, user);
    const state = await buildStorageState(env, provisioned);
    await writeFile(storageStatePath(persona), JSON.stringify(state, null, 2));
    // eslint-disable-next-line no-console
    console.log(`[e2e] Provisioned + injected session for "${persona}" (${user.email}).`);
  }
}
