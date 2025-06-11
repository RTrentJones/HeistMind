'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

/**
 * Hook to handle OAuth callback scenarios and ensure auth state is properly refreshed
 */
export function useOAuthCallbackHandler(refreshUser: () => Promise<void>) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const hasHandledCallback = useRef(false)

    useEffect(() => {
        // Check if we're on a page that might have been redirected from OAuth
        const isFromOAuth =
            // Direct callback URL
            window.location.pathname === '/auth/callback' ||
            // Or if we have auth success indicator in URL or headers
            searchParams.get('code') !== null ||
            // Or if we detect we're on a protected page after potential OAuth
            (window.location.pathname === '/dashboard' && !hasHandledCallback.current)

        if (isFromOAuth && !hasHandledCallback.current) {
            hasHandledCallback.current = true

            // Force a refresh of the user state to pick up the new session
            refreshUser().then(() => {
                // Clean up URL if we have OAuth parameters
                const currentUrl = new URL(window.location.href)
                if (currentUrl.searchParams.has('code') || currentUrl.searchParams.has('state')) {
                    const cleanUrl = new URL(window.location.href)
                    cleanUrl.searchParams.delete('code')
                    cleanUrl.searchParams.delete('state')
                    router.replace(cleanUrl.pathname + cleanUrl.search)
                }
            })
        }
    }, [searchParams, refreshUser, router])
}
