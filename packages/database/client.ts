import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export function createClient(
  url: string = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  key: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
) {
  return createSupabaseClient<Database>(url, key)
}
