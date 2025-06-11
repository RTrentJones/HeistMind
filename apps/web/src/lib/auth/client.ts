'use client'

import { createClient as createBrowserClient } from '@/lib/supabase/client'

export type { AuthUser } from './server'

// Client-side auth helpers
export function useSupabase() {
    return createBrowserClient()
}

export async function signOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    window.location.href = '/'
}

// OAuth providers configuration
export const oauthProviders = {
    discord: {
        name: 'Discord',
        icon: '🎮',
        description: 'Join your gaming community'
    },
    google: {
        name: 'Google',
        icon: '🔍',
        description: 'Swift and secure access'
    }
} as const

export type OAuthProvider = keyof typeof oauthProviders
