'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { oauthProviders, type OAuthProvider } from '@/lib/auth/client'
import { useTranslation } from '@/lib/i18n/hooks'

interface OAuthButtonsProps {
    redirectTo?: string
}

export function OAuthButtons({ redirectTo = '/dashboard' }: OAuthButtonsProps) {
    const [loading, setLoading] = useState<OAuthProvider | null>(null)
    const { t } = useTranslation()
    const supabase = createClient()

    const handleOAuthSignIn = async (provider: OAuthProvider) => {
        try {
            setLoading(provider)

            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`
                }
            })

            if (error) {
                console.error('OAuth error:', error)
                throw error
            }
        } catch (error) {
            console.error('Error signing in with OAuth:', error)
            setLoading(null)
        }
    }

    return (
        <div className="space-y-3">
            <button
                onClick={() => handleOAuthSignIn('discord')}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-300 atmospheric-glow"
            >
                {loading === 'discord' ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <span className="text-lg">{oauthProviders.discord.icon}</span>
                )}
                <span>{t('auth.signIn.providers.discord.label', { provider: oauthProviders.discord.name })}</span>
            </button>

            <button
                onClick={() => handleOAuthSignIn('google')}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-50 disabled:cursor-not-allowed text-fg-primary font-medium rounded-lg border border-border-default transition-all duration-300"
            >
                {loading === 'google' ? (
                    <div className="w-5 h-5 border-2 border-fg-muted/30 border-t-fg-muted rounded-full animate-spin" />
                ) : (
                    <span className="text-lg">{oauthProviders.google.icon}</span>
                )}
                <span>{t('auth.signIn.providers.google.label', { provider: oauthProviders.google.name })}</span>
            </button>
        </div>
    )
}
