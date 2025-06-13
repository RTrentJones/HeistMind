// Authentication library for HeistMind web app
// Uses the abstracted database package for auth operations

import {
    createAuthService,
    createRepositories,
    type AuthService,
    type DatabaseRepositories
} from '@heist-mind/database'

// Global instances
let authService: AuthService | null = null
let repositories: DatabaseRepositories | null = null

// Initialize auth service and repositories
export function initializeAuth() {
    if (!authService) {
        authService = createAuthService()
    }
    if (!repositories) {
        repositories = createRepositories()
    }
    return { authService, repositories }
}

// Get auth service instance
export function getAuthService(): AuthService {
    if (!authService) {
        ({ authService } = initializeAuth())
    }
    return authService!
}

// Get repositories instance
export function getRepositories(): DatabaseRepositories {
    if (!repositories) {
        ({ repositories } = initializeAuth())
    }
    return repositories!
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
    AuthError
} from '@heist-mind/database'
