// Version-proof session serialization for Playwright storageState injection.
//
// Rather than hand-craft the `sb-<ref>-auth-token` localStorage key/value (the format and
// key-derivation have changed across supabase-js versions, e.g. base64 prefixing), we run a
// real supabase-js client in Node backed by an in-memory storage adapter, sign in, and then
// read back whatever the client wrote. Because the app's browser client is the same library
// talking to the same URL, the key and value it produces are exactly what the app will look
// up — so injection can never drift from the app's expectations.

import { createClient } from '@supabase/supabase-js';
import type { E2EEnv } from './env';
import type { TestUser } from './supabase-admin';

export interface StorageState {
  cookies: never[];
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}

export async function buildStorageState(env: E2EEnv, user: TestUser): Promise<StorageState> {
  const memory = new Map<string, string>();

  const client = createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: k => memory.get(k) ?? null,
        setItem: (k, v) => void memory.set(k, v),
        removeItem: k => void memory.delete(k),
      },
    },
  });

  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) {
    throw new Error(`Could not sign in test user ${user.email}: ${error.message}`);
  }

  const localStorage = [...memory.entries()].map(([name, value]) => ({ name, value }));
  if (localStorage.length === 0) {
    throw new Error(`No session written for ${user.email}; cannot build storageState`);
  }

  return {
    cookies: [],
    // localStorage is per-origin: the injected session must live under the app's origin.
    origins: [{ origin: env.baseURL, localStorage }],
  };
}
