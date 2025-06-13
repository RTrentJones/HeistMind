import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { ThemeMode } from '../types'

interface Modal {
    id: string
    component: string
    props?: Record<string, unknown>
    closable?: boolean
}

interface UIStore {
    // Theme
    theme: ThemeMode
    setTheme: (theme: ThemeMode) => void

    // Navigation
    sidebarOpen: boolean
    setSidebarOpen: (open: boolean) => void
    toggleSidebar: () => void

    // Modals
    modals: Modal[]
    openModal: (id: string, component: string, props?: Record<string, unknown>, closable?: boolean) => void
    closeModal: (id: string) => void
    closeAllModals: () => void

    // Loading states
    globalLoading: boolean
    setGlobalLoading: (loading: boolean) => void

    // Page metadata
    pageTitle: string
    setPageTitle: (title: string) => void

    // Mobile responsiveness
    isMobile: boolean
    setIsMobile: (mobile: boolean) => void

    // Breadcrumbs
    breadcrumbs: Array<{ label: string; href?: string }>
    setBreadcrumbs: (breadcrumbs: Array<{ label: string; href?: string }>) => void
}

export const useUIStore = create<UIStore>()(
    devtools(
        persist(
            (set, _get) => ({
                // Theme
                theme: 'system',
                setTheme: (theme) => set({ theme }),

                // Navigation
                sidebarOpen: true,
                setSidebarOpen: (open) => set({ sidebarOpen: open }),
                toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

                // Modals
                modals: [],
                openModal: (id, component, props, closable = true) => {
                    set((state) => ({
                        modals: [
                            ...state.modals.filter((m) => m.id !== id), // Remove if already exists
                            { id, component, props, closable },
                        ],
                    }))
                },
                closeModal: (id) => {
                    set((state) => ({
                        modals: state.modals.filter((m) => m.id !== id),
                    }))
                },
                closeAllModals: () => set({ modals: [] }),

                // Loading states
                globalLoading: false,
                setGlobalLoading: (loading) => set({ globalLoading: loading }),

                // Page metadata
                pageTitle: 'HeistMind',
                setPageTitle: (title) => set({ pageTitle: title }),

                // Mobile responsiveness
                isMobile: false,
                setIsMobile: (mobile) => set({ isMobile: mobile }),

                // Breadcrumbs
                breadcrumbs: [],
                setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
            }),
            {
                name: 'ui-store',
                partialize: (state) => ({
                    theme: state.theme,
                    sidebarOpen: state.sidebarOpen,
                }),
            }
        ),
        {
            name: 'ui-store',
        }
    )
)

// Convenience hooks for specific UI state
export const useTheme = () => useUIStore((state) => ({ theme: state.theme, setTheme: state.setTheme }))
export const useSidebar = () => useUIStore((state) => ({
    sidebarOpen: state.sidebarOpen,
    setSidebarOpen: state.setSidebarOpen,
    toggleSidebar: state.toggleSidebar
}))
export const useModals = () => useUIStore((state) => ({
    modals: state.modals,
    openModal: state.openModal,
    closeModal: state.closeModal,
    closeAllModals: state.closeAllModals,
}))
