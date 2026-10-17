// Authentication library for HeistMind web app
// Uses the abstracted database package for auth operations

import {
  createDatabaseProvider,
  type AuthService,
  type DatabaseRepositories,
} from '@heist-mind/database';

// Global instances
let authService: AuthService | null = null;
let repositories: DatabaseRepositories | null = null;

// Initialize auth service and repositories from ONE provider → ONE Supabase client. Building them
// separately (createAuthService() + createRepositories()) created two GoTrueClients on the same
// storage key: both auto-refreshed the same refresh token (reuse races → random sign-outs) and
// the browser logged "Multiple GoTrueClient instances detected". Sharing the client also means
// repository queries always carry the session the auth listener sees.
export function initializeAuth(): { authService: AuthService; repositories: DatabaseRepositories } {
  if (!authService || !repositories) {
    const provider = createDatabaseProvider();
    authService = provider.createAuthService();
    repositories = provider.createRepositories();
  }
  return { authService, repositories };
}

// Get auth service instance
export function getAuthService(): AuthService {
  if (!authService) {
    ({ authService } = initializeAuth());
  }
  return authService;
}

// Get repositories instance
export function getRepositories(): DatabaseRepositories {
  if (!repositories) {
    ({ repositories } = initializeAuth());
  }
  return repositories;
}

// Re-export types for convenience
export type {
  User,
  Session,
  AuthContext,
  AuthService,
  DatabaseRepositories,
  SignUpData,
  SignInData,
  UpdateUserData,
  ResetPasswordData,
  AuthResponse,
  AuthError,
} from '@heist-mind/database';
