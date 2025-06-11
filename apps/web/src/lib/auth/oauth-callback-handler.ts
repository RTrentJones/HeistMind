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
        const handleOAuthCallback = async () => {
            // Check if we have OAuth parameters in the URL
            const hasOAuthCode = searchParams.get('code') !== null
            const hasOAuthState = searchParams.get('state') !== null
            const isOnDashboard = window.location.pathname === '/dashboard'

            console.log('OAuth callback check:', {
                hasOAuthCode,
                hasOAuthState,
                isOnDashboard,
                hasHandledCallback: hasHandledCallback.current,
                pathname: window.location.pathname
            })

            // Only trigger if we have OAuth parameters or are on dashboard with unhandled callback
            const shouldHandle = (hasOAuthCode || (isOnDashboard && !hasHandledCallback.current))

            if (shouldHandle && !hasHandledCallback.current) {
                hasHandledCallback.current = true

                console.log('Handling OAuth callback - refreshing user state...')

                try {
                    // Wait for user state to be fully refreshed
                    await refreshUser()

                    console.log('User state refreshed, cleaning up URL...')

                    // Clean up URL after successful auth state update
                    if (hasOAuthCode || hasOAuthState) {
                        const currentUrl = new URL(window.location.href)
                        const cleanUrl = new URL(window.location.pathname, window.location.origin)

                        // Preserve any non-OAuth search params
                        currentUrl.searchParams.forEach((value, key) => {
                            if (key !== 'code' && key !== 'state') {
                                cleanUrl.searchParams.set(key, value)
                            }
                        })

                        console.log('Replacing URL:', {
                            from: window.location.href,
                            to: cleanUrl.toString()
                        })

                        router.replace(cleanUrl.pathname + cleanUrl.search)
                    }
                } catch (error) {
                    console.error('OAuth callback handler error:', error)
                    // Reset the flag so we can try again
                    hasHandledCallback.current = false
                }
            }
        }

        // Add a small delay to ensure DOM is ready
        const timeoutId = setTimeout(handleOAuthCallback, 100)

        return () => clearTimeout(timeoutId)
    }, [searchParams, refreshUser, router])
}
