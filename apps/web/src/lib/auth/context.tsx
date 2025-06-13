'use client'

// React context for authentication state management
// Provides auth state and methods to React components

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getAuthService, type User, type Session, type AuthResponse, type SignUpData, type SignInData, type UpdateUserData, type ResetPasswordData } from './index'

interface AuthContextType {
    user: User | null
    session: Session | null
    loading: boolean
    signUp: (data: SignUpData) => Promise<AuthResponse<Session>>
    signIn: (data: SignInData) => Promise<AuthResponse<Session>>
    signOut: () => Promise<AuthResponse<never>>
    updateUser: (data: UpdateUserData) => Promise<AuthResponse<User>>
    resetPassword: (data: ResetPasswordData) => Promise<AuthResponse<never>>
    refreshSession: () => Promise<AuthResponse<Session>>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export interface AuthProviderProps {
    children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    const authService = getAuthService()

    // Load initial auth state
    useEffect(() => {
        const loadInitialState = async () => {
            try {
                const [currentUser, currentSession] = await Promise.all([
                    authService.getCurrentUser(),
                    authService.getCurrentSession()
                ])

                setUser(currentUser)
                setSession(currentSession)
            } catch (error) {
                console.error('Failed to load initial auth state:', error)
            } finally {
                setLoading(false)
            }
        }

        loadInitialState()

        // Listen for auth state changes
        const unsubscribe = authService.onAuthStateChange((event) => {
            setUser(event.user)
            setSession(event.session)
            setLoading(false)
        })

        return unsubscribe
    }, [authService])

    const signUp = async (data: SignUpData): Promise<AuthResponse<Session>> => {
        setLoading(true)
        try {
            return await authService.signUp(data)
        } finally {
            setLoading(false)
        }
    }

    const signIn = async (data: SignInData): Promise<AuthResponse<Session>> => {
        setLoading(true)
        try {
            return await authService.signIn(data)
        } finally {
            setLoading(false)
        }
    }

    const signOut = async (): Promise<AuthResponse<never>> => {
        setLoading(true)
        try {
            return await authService.signOut()
        } finally {
            setLoading(false)
        }
    }

    const updateUser = async (data: UpdateUserData): Promise<AuthResponse<User>> => {
        setLoading(true)
        try {
            return await authService.updateUser(data)
        } finally {
            setLoading(false)
        }
    }

    const resetPassword = async (data: ResetPasswordData): Promise<AuthResponse<never>> => {
        setLoading(true)
        try {
            return await authService.resetPassword(data)
        } finally {
            setLoading(false)
        }
    }

    const refreshSession = async (): Promise<AuthResponse<Session>> => {
        setLoading(true)
        try {
            return await authService.refreshSession()
        } finally {
            setLoading(false)
        }
    }

    const value: AuthContextType = {
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        updateUser,
        resetPassword,
        refreshSession
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

// Convenience hooks
export function useUser(): User | null {
    const { user } = useAuth()
    return user
}

export function useSession(): Session | null {
    const { session } = useAuth()
    return session
}

export function useAuthLoading(): boolean {
    const { loading } = useAuth()
    return loading
}
