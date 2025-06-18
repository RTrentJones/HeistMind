'use client'

import { useAuth, useAuthActions } from '@/features/auth/stores/auth-store'
import { Button, Header, HeaderBrand, HeaderActions } from '@heist-mind/ui'

export function AuthHeader() {
    const { user, isAuthenticated, isLoading } = useAuth()
    const { signInWithProvider, signOut } = useAuthActions()

    const handleDiscordSignIn = async () => {
        try {
            await signInWithProvider('discord')
        } catch (error) {
            console.error('Discord sign in failed:', error)
        }
    }

    const handleSignOut = async () => {
        try {
            await signOut()
        } catch (error) {
            console.error('Sign out failed:', error)
        }
    }

    return (
        <Header>
            <HeaderBrand>
                <h1 className="text-xl font-bold text-white">
                    <span className="text-primary-400">Heist</span>Mind
                </h1>
            </HeaderBrand>

            <HeaderActions>
                {isAuthenticated && user ? (
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-neutral-300">
                            Welcome, {user.profile?.displayName || user.email}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSignOut}
                            isLoading={isLoading}
                        >
                            Sign Out
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center space-x-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDiscordSignIn}
                            isLoading={isLoading}
                            className="text-neutral-300 hover:text-white"
                        >
                            Sign In
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleDiscordSignIn}
                            isLoading={isLoading}
                        >
                            Sign Up with Discord
                        </Button>
                    </div>
                )}
            </HeaderActions>
        </Header>
    )
}
