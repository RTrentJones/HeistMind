'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOAuthCallbackHandler } from '@/lib/auth/oauth-callback-handler'
import type { User } from '@supabase/supabase-js'
import type { AuthUser } from '@/lib/auth/client'

interface AuthContextType {
    user: AuthUser | null
    loading: boolean
    signOut: () => Promise<void>
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signOut: async () => { },
    refreshUser: async () => { }
})

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

interface AuthProviderProps {
    children: React.ReactNode
    initialUser?: AuthUser | null
}

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
    const [user, setUser] = useState<AuthUser | null>(initialUser)
    const [loading, setLoading] = useState(!initialUser)
    const supabase = createClient()

    const updateUser = useCallback(async (authUser: User) => {
        try {
            // Get profile data (always in public schema)
            const { data: profile } = await supabase
                .schema('public')
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', authUser.id)
                .single()

            setUser({
                id: authUser.id,
                email: authUser.email!,
                name: profile?.username || authUser.user_metadata?.full_name || authUser.email!.split('@')[0],
                avatar: profile?.avatar_url || authUser.user_metadata?.avatar_url,
                role: 'player' // Default role for now
            })
        } catch (error) {
            console.error('Error updating user:', error)
            setUser({
                id: authUser.id,
                email: authUser.email!,
                name: authUser.user_metadata?.full_name || authUser.email!.split('@')[0],
                avatar: authUser.user_metadata?.avatar_url,
                role: 'player'
            })
        }
    }, [supabase])

    const refreshUser = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
            await updateUser(session.user)
        } else {
            setUser(null)
        }
        setLoading(false)
    }, [supabase.auth, updateUser])

    useEffect(() => {
        // Always check for current session, even if initialUser is provided
        // This handles OAuth callback scenarios where server state might be stale
        const getInitialSession = async () => {
            await refreshUser()
        }

        getInitialSession()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state change:', event, session?.user?.email)

                if (session?.user) {
                    await updateUser(session.user)
                } else {
                    setUser(null)
                }
                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [supabase.auth, updateUser, refreshUser])

    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
    }

    // Handle OAuth callback scenarios
    useOAuthCallbackHandler(refreshUser)

    return (
        <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
            {children}
        </AuthContext.Provider>
    )
}
