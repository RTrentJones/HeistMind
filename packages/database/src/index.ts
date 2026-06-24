// HeistMind Database Package
// Clean abstraction layer for database operations

// Re-export domain types (application-facing)
export * from './domain-types';

// Re-export repository interfaces (for dependency injection)
export * from './repositories';

// Re-export the pure character-validity rules (shared by the web UI + the DB layer)
export * from './character-rules';

// Re-export the pure dice resolution (shared by the web UI + the roll repository)
export * from './dice';

// Re-export authentication types and interfaces
export * from './auth-types';

// Database provider factory (implementation-agnostic)
export {
  createDatabaseProvider,
  createRepositories,
  createAuthService,
  createRepositoriesWithClient,
  createAuthServiceWithClient,
  type DatabaseConfig,
} from './provider';

// NOTE: All implementation-specific types (Supabase, etc.) are kept internal
// Only domain types, repository interfaces, and auth interfaces are exposed to maintain clean boundaries
