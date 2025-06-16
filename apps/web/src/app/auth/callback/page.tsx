'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthActions } from '../../../features/auth/stores/auth-store'

export default function AuthCallback() {
    const router = useRouter()
    const _searchParams = useSearchParams()
    const { checkSession } = useAuthActions()

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                // Supabase automatically handles the OAuth callback
                // We just need to check the session
                await checkSession()

                // Redirect to dashboard or home
                router.push('/')
            } catch (error) {
                console.error('Auth callback error:', error)
                router.push('/?error=auth_callback_failed')
            }
        }

        handleAuthCallback()
    }, [checkSession, router])

    return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
            <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400 mx-auto"></div>
                <p className="text-neutral-300">Completing sign in...</p>
            </div>
        </div>
    )
}
