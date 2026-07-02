// Internal client creation for Supabase implementation
// This is used by the provider and should not be exported from the main package

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';

/** A required env var, with a boot-time failure that names the missing key (not a cryptic
 * supabase-js "Invalid URL" three frames later). */
function requiredEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable ${name} — see .env.example.`);
  }
  return value;
}

export function createClient(
  url: string = requiredEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  key: string = requiredEnv(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
) {
  return createSupabaseClient<Database>(url, key);
}
