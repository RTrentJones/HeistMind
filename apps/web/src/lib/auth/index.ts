// Re-export server-side functions (only for server components)
export { getUser, requireAuth } from './server'
export type { AuthUser } from './server'

// Re-export client-side functions (only for client components)
export { useSupabase, signOut, oauthProviders } from './client'
export type { OAuthProvider } from './client'
