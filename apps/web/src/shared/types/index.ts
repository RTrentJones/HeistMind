import { ValidationError } from '@heist-mind/database'

// Shared types across all features
export * from '@heist-mind/database'

// API Response types
export interface ApiResponse<T = any> {
    data: T
    success: boolean
    message?: string
    errors?: ValidationError[]
}

export interface PaginationMeta {
    page: number
    limit: number
    total: number
    hasNext: boolean
    hasPrev: boolean
}

export interface PaginatedApiResponse<T = any> extends ApiResponse<T> {
    meta: PaginationMeta
}

// UI State types
export interface LoadingState {
    isLoading: boolean
    error: string | null
    lastUpdated?: Date
}

export interface FormState<T = any> extends LoadingState {
    data: T
    isDirty: boolean
    isValid: boolean
    errors: Record<string, string[]>
}

// Notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
    id: string
    type: NotificationType
    title: string
    message?: string
    duration?: number
    persistent?: boolean
    actions?: NotificationAction[]
}

export interface NotificationAction {
    label: string
    action: () => void
    variant?: 'primary' | 'secondary'
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system'

// Route types
export interface AppRoute {
    path: string
    label: string
    icon?: string
    requiresAuth?: boolean
    roles?: string[]
}
