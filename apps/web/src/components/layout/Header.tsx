"use client"

import { useState } from "react"
import Link from "next/link"
import { useTranslation, useNavigationTranslation } from "@/lib/i18n/hooks"

interface HeaderProps {
    isAuthenticated?: boolean
    user?: {
        name: string
        avatar?: string
    }
}

export function Header({ isAuthenticated = false, user }: HeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const { t } = useTranslation()
    const { t: nav } = useNavigationTranslation()

    return (
        <header className="atmospheric-bg border-b border-border-default backdrop-blur-sm bg-bg-primary/90 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-3 group">
                        <div className="w-8 h-8 bg-ember rounded-lg flex items-center justify-center atmospheric-glow group-hover:ember-glow transition-all duration-300">
                            <span className="text-fg-inverse font-bold text-lg">⚡</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-display font-bold text-xl text-fg-primary group-hover:text-ember transition-colors duration-300">
                                HeistMind
                            </span>
                            <span className="text-xs text-fg-muted font-body -mt-1">
                                {t('common.welcome.subtitle')}
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        <Link
                            href="/about"
                            className="text-fg-secondary hover:text-ember transition-colors duration-300 font-medium"
                        >
                            {nav('about')}
                        </Link>
                        <Link
                            href="/features"
                            className="text-fg-secondary hover:text-ember transition-colors duration-300 font-medium"
                        >
                            {nav('features')}
                        </Link>
                        <Link
                            href="/community"
                            className="text-fg-secondary hover:text-ember transition-colors duration-300 font-medium"
                        >
                            {nav('community')}
                        </Link>
                        <Link
                            href="/docs"
                            className="text-fg-secondary hover:text-ember transition-colors duration-300 font-medium"
                        >
                            {nav('documentation')}
                        </Link>
                    </nav>

                    {/* Authentication Section */}
                    <div className="flex items-center space-x-4">
                        {isAuthenticated && user ? (
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-2">
                                    {user.avatar ? (
                                        <img
                                            src={user.avatar}
                                            alt={user.name}
                                            className="w-8 h-8 rounded-full border border-border-default"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 bg-steel rounded-full flex items-center justify-center">
                                            <span className="text-fg-primary font-medium text-sm">
                                                {user.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <span className="text-fg-primary font-medium hidden sm:block">
                                        {user.name}
                                    </span>
                                </div>
                                <Link
                                    href="/dashboard"
                                    className="btn btn-primary"
                                >
                                    {t('common.actions.dashboard')}
                                </Link>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-3">
                                <Link
                                    href="/auth/signin"
                                    className="text-fg-secondary hover:text-ember transition-colors duration-300 font-medium hidden sm:block"
                                >
                                    {t('common.actions.signIn')}
                                </Link>
                                <Link
                                    href="/auth/signup"
                                    className="btn btn-primary"
                                >
                                    {t('common.actions.signUp')}
                                </Link>
                            </div>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="md:hidden p-2 rounded-md text-fg-secondary hover:text-ember hover:bg-bg-secondary transition-all duration-300"
                            aria-label={t('components.header.menuToggle')}
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                {isMenuOpen ? (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                ) : (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden border-t border-border-muted mt-2 pt-4 pb-4 fade-in-up">
                        <nav className="flex flex-col space-y-4">
                            <Link
                                href="/about"
                                className="text-fg-secondary hover:text-ember transition-colors duration-300 font-medium py-2"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {nav('about')}
                            </Link>
                            <Link
                                href="/features"
                                className="text-fg-secondary hover:text-ember transition-colors duration-300 font-medium py-2"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {nav('features')}
                            </Link>
                            <Link
                                href="/community"
                                className="text-fg-secondary hover:text-ember transition-colors duration-300 font-medium py-2"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {nav('community')}
                            </Link>
                            <Link
                                href="/docs"
                                className="text-fg-secondary hover:text-ember transition-colors duration-300 font-medium py-2"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {nav('documentation')}
                            </Link>

                            {!isAuthenticated && (
                                <div className="pt-4 border-t border-border-muted mt-4">
                                    <Link
                                        href="/auth/signin"
                                        className="block text-fg-secondary hover:text-ember transition-colors duration-300 font-medium py-2"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        {t('common.actions.signIn')}
                                    </Link>
                                </div>
                            )}
                        </nav>
                    </div>
                )}
            </div>
        </header>
    )
}
