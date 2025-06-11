import { requireAuth } from '@/lib/auth/server'
import { Header } from '@/components/layout/Header'
import { getServerTranslation } from '@/lib/i18n/server'

export default async function DashboardPage() {
    const user = await requireAuth()

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header isAuthenticated={true} user={{ name: user.name, avatar: user.avatar }} />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="space-y-8">
                    {/* Welcome Section */}
                    <div className="bg-bg-secondary/50 backdrop-blur-sm rounded-xl border border-border-default p-8 atmospheric-bg">
                        <h1 className="text-3xl font-bold text-fg-primary mb-2">
                            {getServerTranslation('pages.dashboard.welcome').replace('{{name}}', user.name)}
                        </h1>
                        <p className="text-fg-secondary">
                            {getServerTranslation('pages.dashboard.subtitle')}
                        </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-default p-6 atmospheric-bg">
                            <h2 className="text-xl font-semibold text-fg-primary mb-4">
                                {getServerTranslation('pages.dashboard.quickActions')}
                            </h2>
                            <div className="space-y-3">
                                <button className="w-full btn btn-primary">
                                    {getServerTranslation('pages.dashboard.actions.createGame')}
                                </button>
                                <button className="w-full btn btn-secondary">
                                    {getServerTranslation('pages.dashboard.actions.joinGame')}
                                </button>
                                <button className="w-full btn btn-secondary">
                                    {getServerTranslation('pages.dashboard.actions.uploadRuleset')}
                                </button>
                            </div>
                        </div>

                        <div className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-default p-6 atmospheric-bg">
                            <h2 className="text-xl font-semibold text-fg-primary mb-4">
                                {getServerTranslation('pages.dashboard.recentActivity')}
                            </h2>
                            <div className="text-fg-muted text-center py-8">
                                {getServerTranslation('pages.dashboard.noActivity')}
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-default p-6 text-center atmospheric-bg">
                            <div className="text-2xl font-bold text-ember">0</div>
                            <div className="text-fg-secondary">{getServerTranslation('pages.dashboard.activeGames')}</div>
                        </div>
                        <div className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-default p-6 text-center atmospheric-bg">
                            <div className="text-2xl font-bold text-ember">0</div>
                            <div className="text-fg-secondary">{getServerTranslation('pages.dashboard.characters')}</div>
                        </div>
                        <div className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-default p-6 text-center atmospheric-bg">
                            <div className="text-2xl font-bold text-ember">0</div>
                            <div className="text-fg-secondary">{getServerTranslation('pages.dashboard.rulesets')}</div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
