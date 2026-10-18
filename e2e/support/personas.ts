// Throwaway personas for specs that consume or mutate account state (membership, deletes, first
// run). Each is a fresh auth user born through handle_new_user (F68), with its real session
// injected — never the shared gm/player/discord personas, so runs can't interfere.
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { getE2EEnv } from './env';
import { buildStorageState } from './storage-state';
import { deleteTestUser, provisionThrowawayUser } from './supabase-admin';
import type { TestUser } from './supabase-admin';

export interface Throwaway {
  user: Required<TestUser>;
  context: BrowserContext;
  page: Page;
  /** Close the context and delete the user (idempotent; safe in a finally). */
  dispose: () => Promise<void>;
}

export async function throwawayPage(browser: Browser): Promise<Throwaway> {
  const env = getE2EEnv();
  const user = await provisionThrowawayUser(env);
  const context = await browser.newContext({ storageState: await buildStorageState(env, user) });
  const page = await context.newPage();
  return {
    user,
    context,
    page,
    dispose: async () => {
      await context.close().catch(() => undefined);
      await deleteTestUser(env, user.id).catch(() => undefined);
    },
  };
}
