// HeistMind Database Package
// Clean abstraction layer for database operations

// Re-export domain types (application-facing)
export * from './domain-types'

// Re-export repository interfaces (for dependency injection)
export * from './repositories'

// Supabase implementation (internal use)
export { createSupabaseClient } from './client'

// Type utilities for Supabase integration (internal use)
export type { Database } from './types'
