import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import {
    Game,
    GameWithDetails,
    CreateGameData,
    UpdateGameData,
    GameState,
    PaginatedResult,
} from '@heist-mind/database'
import { LoadingState } from '../../../shared/types'
import { getRepositories } from '../../../lib/auth'

interface GamesState extends LoadingState {
    // Game collections
    games: Game[]
    userGames: Game[]
    gameDetails: Record<string, GameWithDetails>
    selectedGame: GameWithDetails | null

    // Pagination
    pagination: {
        page: number
        limit: number
        total: number
        hasMore: boolean
    }

    // Filters
    filters: {
        state?: GameState[]
        search?: string
        rulesetId?: string
        publicOnly?: boolean
    }

    // Actions - Game CRUD
    loadGames: (refresh?: boolean) => Promise<void>
    loadUserGames: (userId: string, refresh?: boolean) => Promise<void>
    loadGameDetails: (gameId: string, refresh?: boolean) => Promise<void>
    createGame: (data: CreateGameData) => Promise<Game>
    updateGame: (gameId: string, data: UpdateGameData) => Promise<Game>
    deleteGame: (gameId: string) => Promise<void>

    // Actions - Game Management
    joinGame: (gameId: string, _inviteCode?: string) => Promise<void>
    leaveGame: (gameId: string) => Promise<void>
    updateGameState: (gameId: string, state: GameState) => Promise<void>

    // Actions - Selection & Filters
    selectGame: (gameId: string) => void
    clearSelection: () => void
    setFilters: (filters: Partial<GamesState['filters']>) => void
    clearFilters: () => void

    // Actions - Pagination
    loadMore: () => Promise<void>
    resetPagination: () => void

    // State management
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    reset: () => void
}

export const useGamesStore = create<GamesState>()(
    devtools(
        persist(
            (set, get) => ({
                // Initial state
                games: [],
                userGames: [],
                gameDetails: {},
                selectedGame: null,
                isLoading: false,
                error: null,
                lastUpdated: undefined,

                pagination: {
                    page: 1,
                    limit: 20,
                    total: 0,
                    hasMore: false,
                },

                filters: {},

                // Game CRUD operations
                loadGames: async (refresh = false) => {
                    const { pagination } = get()

                    if (refresh) {
                        set({ games: [], pagination: { ...pagination, page: 1 } })
                    }

                    set({ isLoading: true, error: null })
                    try {
                        const repositories = getRepositories()
                        const result = await repositories.games.findPublic(
                            pagination.limit,
                            pagination.page === 1 ? undefined : `page_${pagination.page}`
                        )

                        if (!result.success) {
                            throw new Error(result.error?.message || 'Failed to load games')
                        }

                        const paginatedData = result.data as PaginatedResult<Game>

                        set((state) => ({
                            games: refresh ? paginatedData.data : [...state.games, ...paginatedData.data],
                            pagination: {
                                ...state.pagination,
                                total: paginatedData.count,
                                hasMore: paginatedData.hasMore,
                            },
                            isLoading: false,
                            lastUpdated: new Date(),
                        }))
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to load games',
                            isLoading: false,
                        })
                        throw error
                    }
                },

                loadUserGames: async (userId: string, refresh = false) => {
                    if (refresh) {
                        set({ userGames: [] })
                    }

                    set({ isLoading: true, error: null })
                    try {
                        const repositories = getRepositories()
                        const result = await repositories.games.findByPlayer(userId)

                        if (!result.success) {
                            throw new Error(result.error?.message || 'Failed to load user games')
                        }

                        set({
                            userGames: result.data,
                            isLoading: false,
                            lastUpdated: new Date(),
                        })
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to load user games',
                            isLoading: false,
                        })
                        throw error
                    }
                },

                loadGameDetails: async (gameId: string, refresh = false) => {
                    const { gameDetails } = get()

                    if (!refresh && gameDetails[gameId]) {
                        set({ selectedGame: gameDetails[gameId] })
                        return
                    }

                    set({ isLoading: true, error: null })
                    try {
                        const repositories = getRepositories()
                        const result = await repositories.games.findWithDetails(gameId)

                        if (!result.success) {
                            throw new Error('Game not found')
                        }

                        if (!result.data) {
                            throw new Error('Game not found')
                        }

                        set((state) => ({
                            gameDetails: {
                                ...state.gameDetails,
                                [gameId]: result.data!,
                            },
                            selectedGame: result.data!,
                            isLoading: false,
                            lastUpdated: new Date(),
                        }))
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to load game details',
                            isLoading: false,
                        })
                        throw error
                    }
                },

                createGame: async (data: CreateGameData) => {
                    set({ isLoading: true, error: null })
                    try {
                        const repositories = getRepositories()
                        const result = await repositories.games.create('current-user-id', data) // TODO: Get from auth

                        if (!result.success) {
                            throw new Error(result.error?.message || 'Failed to create game')
                        }

                        const newGame = result.data

                        set((state) => ({
                            games: [newGame, ...state.games],
                            userGames: [newGame, ...state.userGames],
                            isLoading: false,
                            lastUpdated: new Date(),
                        }))

                        return newGame
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to create game',
                            isLoading: false,
                        })
                        throw error
                    }
                },

                updateGame: async (gameId: string, data: UpdateGameData) => {
                    set({ isLoading: true, error: null })
                    try {
                        const repositories = getRepositories()
                        const result = await repositories.games.update(gameId, 'current-user-id', data) // TODO: Get from auth

                        if (!result.success) {
                            throw new Error(result.error?.message || 'Failed to update game')
                        }

                        const updatedGame = result.data

                        set((state) => ({
                            games: state.games.map(game => game.id === gameId ? updatedGame : game),
                            userGames: state.userGames.map(game => game.id === gameId ? updatedGame : game),
                            gameDetails: state.gameDetails[gameId]
                                ? { ...state.gameDetails, [gameId]: { ...state.gameDetails[gameId], ...updatedGame } }
                                : state.gameDetails,
                            selectedGame: state.selectedGame?.id === gameId
                                ? { ...state.selectedGame, ...updatedGame }
                                : state.selectedGame,
                            isLoading: false,
                            lastUpdated: new Date(),
                        }))

                        return updatedGame
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to update game',
                            isLoading: false,
                        })
                        throw error
                    }
                },

                deleteGame: async (gameId: string) => {
                    set({ isLoading: true, error: null })
                    try {
                        const repositories = getRepositories()
                        const result = await repositories.games.delete(gameId, 'current-user-id') // TODO: Get from auth

                        if (!result.success) {
                            throw new Error(result.error?.message || 'Failed to delete game')
                        }

                        set((state) => ({
                            games: state.games.filter(game => game.id !== gameId),
                            userGames: state.userGames.filter(game => game.id !== gameId),
                            gameDetails: Object.fromEntries(
                                Object.entries(state.gameDetails).filter(([id]) => id !== gameId)
                            ),
                            selectedGame: state.selectedGame?.id === gameId ? null : state.selectedGame,
                            isLoading: false,
                            lastUpdated: new Date(),
                        }))
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to delete game',
                            isLoading: false,
                        })
                        throw error
                    }
                },

                // Game management operations
                joinGame: async (gameId: string, _inviteCode?: string) => {
                    set({ isLoading: true, error: null })
                    try {
                        const repositories = getRepositories()
                        const result = await repositories.gamePlayers.addPlayer(
                            gameId,
                            'current-user-id', // TODO: Get from auth
                            'current-user-id', // TODO: Get from auth
                            'player'
                        )

                        if (!result.success) {
                            throw new Error(result.error?.message || 'Failed to join game')
                        }

                        // Refresh game details after joining
                        await get().loadGameDetails(gameId, true)

                        set({ isLoading: false })
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to join game',
                            isLoading: false,
                        })
                        throw error
                    }
                },

                leaveGame: async (gameId: string) => {
                    set({ isLoading: true, error: null })
                    try {
                        const repositories = getRepositories()
                        const result = await repositories.gamePlayers.removePlayer(
                            gameId,
                            'current-user-id', // TODO: Get from auth
                            'current-user-id'  // TODO: Get from auth
                        )

                        if (!result.success) {
                            throw new Error(result.error?.message || 'Failed to leave game')
                        }

                        // Remove from user games and refresh details
                        set((state) => ({
                            userGames: state.userGames.filter(game => game.id !== gameId),
                            isLoading: false,
                            lastUpdated: new Date(),
                        }))

                        // Refresh game details
                        await get().loadGameDetails(gameId, true)
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to leave game',
                            isLoading: false,
                        })
                        throw error
                    }
                },

                updateGameState: async (gameId: string, state: GameState) => {
                    await get().updateGame(gameId, { state })
                },

                // Selection and filters
                selectGame: (gameId: string) => {
                    const { gameDetails } = get()
                    if (gameDetails[gameId]) {
                        set({ selectedGame: gameDetails[gameId] })
                    } else {
                        get().loadGameDetails(gameId)
                    }
                },

                clearSelection: () => set({ selectedGame: null }),

                setFilters: (newFilters) => {
                    set((state) => ({
                        filters: { ...state.filters, ...newFilters },
                        pagination: { ...state.pagination, page: 1 },
                    }))
                    // Reload games with new filters
                    get().loadGames(true)
                },

                clearFilters: () => {
                    set({ filters: {} })
                    get().loadGames(true)
                },

                // Pagination
                loadMore: async () => {
                    const { pagination } = get()
                    if (!pagination.hasMore) return

                    set((state) => ({
                        pagination: { ...state.pagination, page: state.pagination.page + 1 }
                    }))

                    await get().loadGames(false)
                },

                resetPagination: () => {
                    set((state) => ({
                        pagination: { ...state.pagination, page: 1 }
                    }))
                },

                // State management
                setLoading: (isLoading: boolean) => set({ isLoading }),
                setError: (error: string | null) => set({ error }),
                reset: () => set({
                    games: [],
                    userGames: [],
                    gameDetails: {},
                    selectedGame: null,
                    isLoading: false,
                    error: null,
                    lastUpdated: undefined,
                    pagination: {
                        page: 1,
                        limit: 20,
                        total: 0,
                        hasMore: false,
                    },
                    filters: {},
                }),
            }),
            {
                name: 'games-store',
                partialize: (state) => ({
                    // Only persist game selection and filters
                    selectedGame: state.selectedGame,
                    filters: state.filters,
                }),
            }
        ),
        {
            name: 'games-store',
        }
    )
)

// Convenience selectors
export const useGames = () => useGamesStore((state) => ({
    games: state.games,
    userGames: state.userGames,
    selectedGame: state.selectedGame,
    isLoading: state.isLoading,
    error: state.error,
    pagination: state.pagination,
    filters: state.filters,
}))

export const useGameActions = () => useGamesStore((state) => ({
    loadGames: state.loadGames,
    loadUserGames: state.loadUserGames,
    loadGameDetails: state.loadGameDetails,
    createGame: state.createGame,
    updateGame: state.updateGame,
    deleteGame: state.deleteGame,
    joinGame: state.joinGame,
    leaveGame: state.leaveGame,
    updateGameState: state.updateGameState,
    selectGame: state.selectGame,
    clearSelection: state.clearSelection,
    setFilters: state.setFilters,
    clearFilters: state.clearFilters,
    loadMore: state.loadMore,
    resetPagination: state.resetPagination,
}))

// Computed selectors
export const useActiveGames = () => useGamesStore((state) =>
    state.games.filter(game => game.state === 'active' || game.state === 'recruiting')
)

export const useUserCreatedGames = () => useGamesStore((state) =>
    state.userGames.filter(game => game.createdBy === 'current-user-id') // TODO: Get from auth
)
