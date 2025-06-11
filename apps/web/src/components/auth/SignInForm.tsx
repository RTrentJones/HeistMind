'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/lib/i18n/hooks'

interface SignInFormProps {
    redirectTo?: string
}

export function SignInForm({ redirectTo = '/dashboard' }: SignInFormProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { t } = useTranslation()
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) throw error

            // Redirect will be handled by auth state change
            window.location.href = redirectTo
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('Sign in error:', error)
            setError(errorMessage || t('errors.auth.invalidCredentials'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-fg-secondary mb-2">
                    {t('forms.labels.email')}
                </label>
                <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('forms.placeholders.email')}
                    className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-fg-primary placeholder-fg-muted focus:outline-none focus:ring-2 focus:ring-ember focus:border-transparent transition-all duration-300"
                />
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-fg-secondary mb-2">
                    {t('forms.labels.password')}
                </label>
                <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('forms.placeholders.password')}
                    className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-fg-primary placeholder-fg-muted focus:outline-none focus:ring-2 focus:ring-ember focus:border-transparent transition-all duration-300"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-fg-inverse/30 border-t-fg-inverse rounded-full animate-spin" />
                        {t('common.loading.default')}
                    </div>
                ) : (
                    t('common.actions.signIn')
                )}
            </button>
        </form>
    )
}
