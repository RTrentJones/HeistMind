'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/lib/i18n/hooks'

interface SignUpFormProps {
    redirectTo?: string
}

export function SignUpForm({ redirectTo: _redirectTo = '/dashboard' }: SignUpFormProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const { t } = useTranslation()
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        // Validation
        if (password !== confirmPassword) {
            setError(t('forms.validation.passwordsDoNotMatch'))
            setLoading(false)
            return
        }

        if (password.length < 8) {
            setError(t('forms.validation.passwordTooShort'))
            setLoading(false)
            return
        }

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: displayName || email.split('@')[0]
                    }
                }
            })

            if (error) throw error

            setSuccess(true)
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('Sign up error:', error)
            setError(errorMessage || t('errors.general'))
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl">✅</span>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-fg-primary mb-2">{t('auth.signUp.success.title')}</h3>
                    <p className="text-fg-secondary text-sm">
                        {t('auth.signUp.success.message')}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-fg-secondary mb-2">
                    {t('forms.labels.displayName')}
                </label>
                <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t('forms.placeholders.displayName')}
                    className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-fg-primary placeholder-fg-muted focus:outline-none focus:ring-2 focus:ring-ember focus:border-transparent transition-all duration-300"
                />
            </div>

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

            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-fg-secondary mb-2">
                    {t('forms.labels.confirmPassword')}
                </label>
                <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('forms.placeholders.confirmPassword')}
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
                    t('common.actions.signUp')
                )}
            </button>
        </form>
    )
}
