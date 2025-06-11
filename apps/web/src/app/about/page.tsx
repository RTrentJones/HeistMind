"use client"

import { Header } from "@/components/layout/Header"
import { useTranslation } from "@/lib/i18n/hooks"

export default function AboutPage() {
    const { t } = useTranslation()

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center">
                    <div className="w-16 h-16 bg-ember rounded-lg flex items-center justify-center atmospheric-glow mx-auto mb-8">
                        <span className="text-fg-inverse font-bold text-2xl">⚡</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-display font-bold text-fg-primary mb-6">
                        {t('pages.about.title')}
                    </h1>

                    <p className="text-xl text-fg-secondary mb-12 max-w-3xl mx-auto">
                        {t('pages.about.subtitle')}
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-12 mt-16">
                    <div className="bg-bg-secondary rounded-lg p-8 border border-border-default">
                        <h2 className="text-2xl font-display font-bold text-fg-primary mb-4">
                            {t('pages.about.sections.gameMasters.title')}
                        </h2>
                        <p className="text-fg-secondary mb-6">
                            {t('pages.about.sections.gameMasters.description')}
                        </p>
                        <ul className="space-y-3 text-fg-secondary">
                            <li className="flex items-center">
                                <span className="w-2 h-2 bg-ember rounded-full mr-3"></span>
                                {t('pages.about.sections.gameMasters.features.uploadRulesets')}
                            </li>
                            <li className="flex items-center">
                                <span className="w-2 h-2 bg-ember rounded-full mr-3"></span>
                                {t('pages.about.sections.gameMasters.features.createGames')}
                            </li>
                            <li className="flex items-center">
                                <span className="w-2 h-2 bg-ember rounded-full mr-3"></span>
                                {t('pages.about.sections.gameMasters.features.invitePlayers')}
                            </li>
                            <li className="flex items-center">
                                <span className="w-2 h-2 bg-ember rounded-full mr-3"></span>
                                {t('pages.about.sections.gameMasters.features.trackProgress')}
                            </li>
                        </ul>
                    </div>

                    <div className="bg-bg-secondary rounded-lg p-8 border border-border-default">
                        <h2 className="text-2xl font-display font-bold text-fg-primary mb-4">
                            {t('pages.about.sections.players.title')}
                        </h2>
                        <p className="text-fg-secondary mb-6">
                            {t('pages.about.sections.players.description')}
                        </p>
                        <ul className="space-y-3 text-fg-secondary">
                            <li className="flex items-center">
                                <span className="w-2 h-2 bg-steel rounded-full mr-3"></span>
                                {t('pages.about.sections.players.features.joinGames')}
                            </li>
                            <li className="flex items-center">
                                <span className="w-2 h-2 bg-steel rounded-full mr-3"></span>
                                {t('pages.about.sections.players.features.createCharacters')}
                            </li>
                            <li className="flex items-center">
                                <span className="w-2 h-2 bg-steel rounded-full mr-3"></span>
                                {t('pages.about.sections.players.features.trackProgression')}
                            </li>
                            <li className="flex items-center">
                                <span className="w-2 h-2 bg-steel rounded-full mr-3"></span>
                                {t('pages.about.sections.players.features.collaborate')}
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-16 text-center">
                    <h2 className="text-3xl font-display font-bold text-fg-primary mb-8">
                        {t('pages.about.sections.philosophy.title')}
                    </h2>
                    <p className="text-lg text-fg-secondary max-w-3xl mx-auto">
                        {t('pages.about.sections.philosophy.description')}
                    </p>
                </div>
            </main>
        </div>
    )
}
