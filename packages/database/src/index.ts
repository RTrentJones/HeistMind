// HeistMind Database Package — the client-agnostic data-access layer.
// Domain types + the pure FitD rules live in @heist-mind/core (import them from there);
// this package exposes the persistence surface only: repository CONTRACTS, the auth-service
// contract, and the provider factories. Implementation-specific types (Supabase, etc.) stay
// internal so the datastore can swap behind the factories.

// Repository interfaces (for dependency injection)
export * from './repositories';

// Authentication types and interfaces
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
