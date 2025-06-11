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
        console.log('AuthProvider: updateUser called for:', authUser.email)

        // Create fallback user data from auth metadata
        const fallbackUserData: AuthUser = {
            id: authUser.id,
            email: authUser.email!,
            name: authUser.user_metadata?.full_name || authUser.email!.split('@')[0],
            avatar: authUser.user_metadata?.avatar_url,
            role: 'player' as const
        }

        try {
            // Get profile data with timeout to prevent hanging
            console.log('AuthProvider: Fetching profile for user ID:', authUser.id)

            const profilePromise = supabase
                .schema('public')
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', authUser.id)
                .single()

            // Add 5 second timeout to prevent hanging in preview environments
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
            )

            let profile = null
            let profileError = null

            try {
                const result = await Promise.race([
                    profilePromise,
                    timeoutPromise
                ])

                // If we get here, profilePromise won (not timeout)
                const response = result as Awaited<typeof profilePromise>
                profile = response.data
                profileError = response.error
            } catch (timeoutError) {
                // Timeout or other error occurred
                profileError = timeoutError
            }

            if (profileError) {
                console.log('AuthProvider: Profile fetch error:', profileError)
                // Use fallback data but still set user state
                console.log('AuthProvider: Using fallback user data due to profile error')
                setUser(fallbackUserData)
                return
            }

            console.log('AuthProvider: Profile fetched successfully:', profile)

            // Merge profile data with auth data
            const userData: AuthUser = {
                id: authUser.id,
                email: authUser.email!,
                name: profile?.username || authUser.user_metadata?.full_name || authUser.email!.split('@')[0],
                avatar: profile?.avatar_url || authUser.user_metadata?.avatar_url,
                role: 'player' as const
            }

            console.log('AuthProvider: Setting user state with profile data:', userData)
            setUser(userData)

        } catch (error) {
            console.error('AuthProvider: Error updating user (using fallback):', error)
            console.log('AuthProvider: Setting fallback user state due to error')
            setUser(fallbackUserData)
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
                // Don't manage loading here - let refreshUser handle it
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
