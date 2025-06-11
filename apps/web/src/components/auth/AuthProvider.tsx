'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
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
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [loading, setLoading] = useState(true)
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
        console.log('AuthProvider: Refreshing user session...')
        setLoading(true)

        try {
            const { data: { session }, error } = await supabase.auth.getSession()

            if (error) {
                console.error('AuthProvider: Error getting session:', error)
                setUser(null)
                setLoading(false)
                return
            }

            if (session?.user) {
                console.log('AuthProvider: Found session for user:', session.user.email)
                await updateUser(session.user)
            } else {
                console.log('AuthProvider: No session found')
                setUser(null)
            }
        } catch (error) {
            console.error('AuthProvider: Refresh user error:', error)
            setUser(null)
        } finally {
            setLoading(false)
        }
    }, [supabase.auth, updateUser])

    useEffect(() => {
        // Get the current session on mount and set up auth state listener
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

    return (
        <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
            {children}
        </AuthContext.Provider>
    )
}
