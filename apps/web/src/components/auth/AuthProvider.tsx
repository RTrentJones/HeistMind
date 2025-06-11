'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { AuthUser } from '@/lib/auth/client'

interface AuthContextType {
    user: AuthUser | null
    loading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signOut: async () => { }
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

    const updateUser = async (authUser: User) => {
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
    }

    useEffect(() => {
        // Get initial session
        const getInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (session?.user) {
                await updateUser(session.user)
            } else {
                setUser(null)
            }
            setLoading(false)
        }

        if (!initialUser) {
            getInitialSession()
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user) {
                    await updateUser(session.user)
                } else {
                    setUser(null)
                }
                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [supabase.auth, initialUser, updateUser])

    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}
