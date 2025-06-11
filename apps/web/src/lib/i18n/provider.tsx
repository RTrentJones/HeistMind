"use client"

import { useEffect, useState } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from './index'

interface I18nProviderProps {
    children: React.ReactNode
    initialLanguage?: string
}

export function I18nProvider({ children, initialLanguage }: I18nProviderProps) {
    const [isInitialized, setIsInitialized] = useState(false)

    useEffect(() => {
        const initializeI18n = async () => {
            // Get language preference from localStorage or use initial language
            const savedLanguage = typeof window !== 'undefined'
                ? localStorage.getItem('heistmind-language')
                : null

            const language = savedLanguage || initialLanguage || 'en'

            // Change language if different from current
            if (i18n.language !== language) {
                await i18n.changeLanguage(language)
            }

            setIsInitialized(true)
        }

        initializeI18n()
    }, [initialLanguage])

    // Show loading until i18n is initialized
    if (!isInitialized) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 bg-ember rounded-lg flex items-center justify-center atmospheric-glow animate-pulse mb-4 mx-auto">
                        <span className="text-fg-inverse font-bold text-lg">⚡</span>
                    </div>
                    <p className="text-fg-secondary">Preparing the shadows...</p>
                </div>
            </div>
        )
    }

    return (
        <I18nextProvider i18n={i18n}>
            {children}
        </I18nextProvider>
    )
}
