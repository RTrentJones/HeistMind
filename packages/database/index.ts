// HeistMind Database Package
// Clean abstraction layer for database operations

// Re-export domain types (application-facing)
export * from './domain-types'

// Re-export repository interfaces (for dependency injection)
export * from './repositories'

// Supabase implementation (internal use)
export { createClient } from './client'

// NOTE: Supabase types are kept internal to this package
// They are only used within adapters and not exported to maintain clean domain boundaries
