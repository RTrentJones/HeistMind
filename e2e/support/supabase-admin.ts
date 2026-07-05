// Admin-side user provisioning for E2E — the mechanism that lets us validate every
// authenticated flow WITHOUT driving Discord's OAuth consent screen (impossible to
// script reliably: third-party UI, bot detection, possible MFA).
//
// Strategy ("Supabase Admin session inject"):
//   1. Use the service-role key to create deterministic test users (auth.admin.createUser).
//      This fires the existing `handle_new_user` trigger, so a real `profiles` row exists —
//      the same state a Discord sign-up would produce.
//   2. Mint a real session for that user (signInWithPassword) and serialize it exactly the
//      way the browser supabase-js client would (see buildStorageState).
//   3. Playwright injects that session into localStorage, so tests start authenticated.
//
// Discord OAuth itself is validated separately and narrowly (see specs/auth-discord.spec.ts):
// we assert the redirect *wiring*, we do not round-trip the live consent screen.

import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { E2EEnv } from './env';

export interface TestUser {
  email: string;
  password: string;
  username: string;
  /**
   * A Discord snowflake to carry in the signup metadata (`provider_id`/`sub`) so the
   * `handle_new_user` trigger writes `profiles.discord_id` — the PRODUCTION link path
   * (migration 00019). Never hand-seed that column in a spec: the trigger owns it, and
   * hand-seeding is exactly how F68 shipped invisible.
   */
  discordId?: string;
  /** Populated after provisioning. */
  id?: string;
}

// A fresh, NON-committed password each run. `auth.users` is project-global (shared by the
// schema-per-env beta/prod), so a hardcoded password in this PUBLIC repo would mean anyone
// could sign in as these personas on prod. Generating it per run (used only to mint the
// injected session in global-setup, never published) removes that exposure; global-teardown
// then deletes the personas so they don't persist at all.
const RUN_PASSWORD = `E2e-${randomUUID()}`;

/** Deterministic personas (stable emails → idempotent provisioning; per-run password). */
export const TEST_USERS = {
  gm: {
    email: 'e2e-gm@heistmind.test',
    password: RUN_PASSWORD,
    username: 'e2e-gamemaster',
  } satisfies TestUser,
  player: {
    email: 'e2e-player@heistmind.test',
    password: RUN_PASSWORD,
    username: 'e2e-player',
  } satisfies TestUser,
  /** The bot persona — provisioned like a REAL Discord signup (trigger-linked; F68 regression). */
  discord: {
    email: 'e2e-discord@heistmind.test',
    password: RUN_PASSWORD,
    username: 'e2e-discord',
    discordId: 'e2e-discord-424242',
  } satisfies TestUser,
} as const;

function adminClient(env: E2EEnv): SupabaseClient {
  return createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Create (or reuse) a confirmed test user. Idempotent: a second run finds the existing
 * user instead of failing on "already registered".
 */
export async function ensureTestUser(env: E2EEnv, user: TestUser): Promise<TestUser> {
  const admin = adminClient(env);

  // A Discord-linked persona must be BORN through the trigger (it fires on INSERT only). A
  // correctly-linked existing copy is REUSED — the bot's warm-lambda actor cache maps the
  // snowflake to this profile id, so gratuitous recreation would strand the cache mid-suite.
  // Only a stale/unlinked copy is deleted and recreated (profiles cascade from auth.users, so
  // its leftover campaign rows go too), and any OTHER profile still holding this snowflake
  // (e.g. a pre-F68 run that hand-seeded it) must release it first or the trigger's UNIQUE
  // insert makes signup itself fail.
  if (user.discordId) {
    const existing = await findUserByEmail(admin, user.email);
    if (existing) {
      const profile = await admin
        .from('profiles')
        .select('discord_id')
        .eq('id', existing.id)
        .maybeSingle();
      if (profile.data?.discord_id === user.discordId) {
        await admin.auth.admin.updateUserById(existing.id, {
          password: user.password,
          email_confirm: true,
        });
        return { ...user, id: existing.id };
      }
      await admin.auth.admin.deleteUser(existing.id).catch(() => undefined);
    }
    await admin
      .from('profiles')
      .update({ discord_id: null })
      .eq('discord_id', user.discordId)
      .then(() => undefined)
      .catch(() => undefined);
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: {
      username: user.username,
      avatar_url: null,
      // Discord OAuth carries the snowflake here; handle_new_user copies it to
      // profiles.discord_id (00019).
      ...(user.discordId ? { provider_id: user.discordId, sub: user.discordId } : {}),
    },
  });

  if (!error && created.user) {
    return { ...user, id: created.user.id };
  }

  // Already exists (or transient): look it up so the run stays idempotent.
  const existing = await findUserByEmail(admin, user.email);
  if (existing) {
    // Re-assert the password so signInWithPassword is guaranteed to work.
    await admin.auth.admin.updateUserById(existing.id, {
      password: user.password,
      email_confirm: true,
    });
    return { ...user, id: existing.id };
  }

  throw new Error(`Failed to provision test user ${user.email}: ${error?.message ?? 'unknown'}`);
}

async function findUserByEmail(
  admin: SupabaseClient,
  email: string
): Promise<{ id: string } | null> {
  // listUsers is paginated; test projects are tiny so a few pages suffice.
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data.users.length) break;
    const match = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return { id: match.id };
    if (data.users.length < 200) break;
  }
  return null;
}

/** Remove a test user (best-effort teardown). */
export async function deleteTestUser(env: E2EEnv, userId: string): Promise<void> {
  const admin = adminClient(env);
  await admin.auth.admin.deleteUser(userId).catch(() => undefined);
}

/** Delete every deterministic persona — best-effort, idempotent. Called by global-teardown so
 * the test accounts never persist in the project-global auth.users between runs. */
export async function cleanupTestUsers(env: E2EEnv): Promise<void> {
  const admin = adminClient(env);
  for (const user of Object.values(TEST_USERS)) {
    const found = await findUserByEmail(admin, user.email);
    if (found) await admin.auth.admin.deleteUser(found.id).catch(() => undefined);
  }
}
