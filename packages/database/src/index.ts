// HeistMind Database Package
// Clean abstraction layer for database operations

// Re-export domain types (application-facing)
export * from './domain-types';

// Re-export repository interfaces (for dependency injection)
export * from './repositories';

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
