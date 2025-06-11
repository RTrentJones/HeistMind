"use client"

import Link from "next/link"
import { useComponentTranslation } from "@/lib/i18n/hooks"

export function ShadowsGate() {
    const { t } = useComponentTranslation()

    return (
        <section className="atmospheric-bg min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Floating embers */}
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-ember rounded-full opacity-60 float animate-pulse"></div>
                <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-gold rounded-full opacity-40 float animation-delay-2000"></div>
                <div className="absolute bottom-1/4 left-1/2 w-3 h-3 bg-whisper rounded-full opacity-30 float animation-delay-4000"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                <div className="max-w-4xl mx-auto">
                    {/* Main Title */}
                    <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-fg-primary mb-6 fade-in-up">
                        {t('shadowsGate.title')}
                    </h1>

                    {/* Subtitle */}
                    <p className="text-xl md:text-2xl text-fg-secondary mb-8 max-w-3xl mx-auto leading-relaxed fade-in-up animation-delay-200">
                        {t('shadowsGate.subtitle')}
                    </p>

                    {/* Description */}
                    <p className="text-lg text-fg-muted mb-12 max-w-2xl mx-auto fade-in-up animation-delay-400">
                        {t('shadowsGate.description')}
                    </p>

                    {/* Dual Path CTAs */}
                    <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto fade-in-up animation-delay-600">
                        {/* Mastermind Path */}
                        <Link
                            href="/auth/signup?role=mastermind"
                            className="group card card-elevated hover:mastermind-glow transition-all duration-500 p-8 text-left"
                        >
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-mastermind rounded-lg flex items-center justify-center mastermind-glow mr-4 group-hover:scale-110 transition-transform duration-300">
                                    <span className="text-2xl">🎲</span>
                                </div>
                                <div>
                                    <h3 className="font-display text-xl font-bold text-fg-primary group-hover:text-mastermind transition-colors duration-300">
                                        {t('shadowsGate.paths.mastermind.title')}
                                    </h3>
                                    <p className="text-sm text-fg-muted">
                                        {t('shadowsGate.paths.mastermind.subtitle')}
                                    </p>
                                </div>
                            </div>
                            <p className="text-fg-secondary group-hover:text-fg-primary transition-colors duration-300">
                                {t('shadowsGate.paths.mastermind.description')}
                            </p>
                        </Link>

                        {/* Scoundrel Path */}
                        <Link
                            href="/auth/signup?role=scoundrel"
                            className="group card card-elevated hover:scoundrel-glow transition-all duration-500 p-8 text-left"
                        >
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-scoundrel rounded-lg flex items-center justify-center scoundrel-glow mr-4 group-hover:scale-110 transition-transform duration-300">
                                    <span className="text-2xl">⚔️</span>
                                </div>
                                <div>
                                    <h3 className="font-display text-xl font-bold text-fg-primary group-hover:text-scoundrel transition-colors duration-300">
                                        {t('shadowsGate.paths.scoundrel.title')}
                                    </h3>
                                    <p className="text-sm text-fg-muted">
                                        {t('shadowsGate.paths.scoundrel.subtitle')}
                                    </p>
                                </div>
                            </div>
                            <p className="text-fg-secondary group-hover:text-fg-primary transition-colors duration-300">
                                {t('shadowsGate.paths.scoundrel.description')}
                            </p>
                        </Link>
                    </div>

                    {/* Secondary Actions */}
                    <div className="mt-12 fade-in-up animation-delay-800">
                        <Link
                            href="/features"
                            className="btn btn-outline mr-4 mb-4"
                        >
                            Learn More
                        </Link>
                        <Link
                            href="/community"
                            className="text-fg-secondary hover:text-ember transition-colors duration-300 font-medium"
                        >
                            Join the Community →
                        </Link>
                    </div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                <div className="w-6 h-10 border-2 border-fg-muted rounded-full flex justify-center">
                    <div className="w-1 h-3 bg-fg-muted rounded-full mt-2 animate-pulse"></div>
                </div>
            </div>
        </section>
    )
}
