import Link from 'next/link'
import { Suspense } from 'react'
import { getUser } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { getServerTranslation } from '@/lib/i18n/server'

export default async function SignUpPage({
    searchParams
}: {
    searchParams: Promise<{ redirect_to?: string }>
}) {
    // Await searchParams
    const params = await searchParams

    // Redirect if already authenticated
    const user = await getUser()
    if (user) {
        redirect(params.redirect_to || '/dashboard')
    }

    const redirectTo = params.redirect_to || '/dashboard'

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <Link href="/" className="inline-flex items-center gap-3 group">
                        <div className="w-12 h-12 bg-ember rounded-lg flex items-center justify-center atmospheric-glow group-hover:ember-glow transition-all duration-300">
                            <span className="text-fg-inverse font-bold text-2xl">⚡</span>
                        </div>
                        <span className="font-display font-bold text-2xl text-fg-primary group-hover:text-ember transition-colors duration-300">
                            HeistMind
                        </span>
                    </Link>

                    <h2 className="mt-6 text-3xl font-bold text-fg-primary">
                        {getServerTranslation('auth.signUp.title')}
                    </h2>
                    <p className="mt-2 text-sm text-fg-secondary">
                        {getServerTranslation('auth.signUp.subtitle')}
                    </p>
                </div>

                {/* Sign up form */}
                <div className="bg-bg-secondary/50 backdrop-blur-sm rounded-xl border border-border-default p-8 space-y-6 atmospheric-bg">
                    {/* OAuth Buttons */}
                    <Suspense fallback={<div className="h-20 animate-pulse bg-bg-tertiary rounded-lg" />}>
                        <OAuthButtons redirectTo={redirectTo} />
                    </Suspense>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border-muted" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-bg-secondary text-fg-muted">
                                {getServerTranslation('auth.signIn.providers.email.label')}
                            </span>
                        </div>
                    </div>

                    {/* Email/Password Form */}
                    <SignUpForm redirectTo={redirectTo} />

                    {/* Sign in link */}
                    <div className="text-center">
                        <span className="text-fg-muted text-sm">{getServerTranslation('auth.signUp.existingUser')} </span>
                        <Link
                            href={`/auth/signin${redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : ''}`}
                            className="text-ember hover:text-ember-light font-medium text-sm transition-colors duration-300"
                        >
                            {getServerTranslation('auth.signUp.signIn')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
