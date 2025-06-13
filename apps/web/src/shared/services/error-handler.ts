import { useNotificationStore } from '../stores/notification-store'
import { ValidationError, DatabaseError } from '../types'

export interface ErrorDetails {
    message: string
    code?: string
    field?: string
    context?: Record<string, any>
}

export class AppError extends Error {
    public readonly code?: string
    public readonly field?: string
    public readonly context?: Record<string, any>

    constructor(message: string, code?: string, field?: string, context?: Record<string, any>) {
        super(message)
        this.name = 'AppError'
        this.code = code
        this.field = field
        this.context = context
    }
}

export class ValidationAppError extends AppError {
    public readonly errors: ValidationError[]

    constructor(message: string, errors: ValidationError[]) {
        super(message, 'VALIDATION_ERROR')
        this.name = 'ValidationAppError'
        this.errors = errors
    }
}

export class ApiError extends AppError {
    public readonly status: number

    constructor(message: string, status: number, code?: string) {
        super(message, code)
        this.name = 'ApiError'
        this.status = status
    }
}

// Translation function type - will be injected from component context
type TranslationFunction = (key: string, params?: Record<string, any>) => string

// Error handler class
export class ErrorHandler {
    private translate?: TranslationFunction

    public setTranslationFunction(t: TranslationFunction): void {
        this.translate = t
    }

    public handle(error: unknown, context?: string): void {
        console.error('Error occurred:', error, context ? `Context: ${context}` : '')

        const notificationStore = useNotificationStore.getState()

        if (error instanceof ValidationAppError) {
            this.handleValidationError(error, notificationStore)
        } else if (error instanceof ApiError) {
            this.handleApiError(error, notificationStore)
        } else if (error instanceof AppError) {
            this.handleAppError(error, notificationStore)
        } else if (error instanceof Error) {
            this.handleGenericError(error, context, notificationStore)
        } else {
            this.handleUnknownError(error, context, notificationStore)
        }
    }

    private handleValidationError(error: ValidationAppError, notificationStore: any): void {
        const firstError = error.errors[0]
        const title = this.translate?.('errors.validation.title') || 'Validation Error'
        const message = firstError?.message || this.translate?.('errors.validation.general') || error.message

        notificationStore.error(title, message)
    }

    private handleApiError(error: ApiError, notificationStore: any): void {
        let titleKey = 'errors.general'
        let messageKey = 'errors.general'

        switch (error.status) {
            case 401:
                titleKey = 'errors.auth.title'
                messageKey = 'errors.unauthorized'
                break
            case 403:
                titleKey = 'errors.auth.title'
                messageKey = 'errors.unauthorized'
                break
            case 404:
                titleKey = 'errors.notFound.title'
                messageKey = 'errors.notFound'
                break
            case 429:
                titleKey = 'errors.rateLimit.title'
                messageKey = 'errors.rateLimit.message'
                break
            case 500:
                titleKey = 'errors.server.title'
                messageKey = 'errors.serverError'
                break
        }

        const title = this.translate?.(titleKey) || 'Error'
        const message = this.translate?.(messageKey) || error.message

        notificationStore.error(title, message)
    }

    private handleAppError(error: AppError, notificationStore: any): void {
        const title = this.translate?.('errors.general') || 'Application Error'
        notificationStore.error(title, error.message)
    }

    private handleGenericError(error: Error, context: string | undefined, notificationStore: any): void {
        const title = this.translate?.('errors.general') || 'Error'
        const message = error.message || this.translate?.('errors.general') || 'An error occurred'
        notificationStore.error(title, message)
    }

    private handleUnknownError(error: unknown, context: string | undefined, notificationStore: any): void {
        const title = this.translate?.('errors.general') || 'Unexpected Error'
        const message = this.translate?.('errors.general') || 'An unexpected error occurred'
        notificationStore.error(title, message)
    }

    public async handleAsync<T>(
        operation: () => Promise<T>,
        context?: string
    ): Promise<T | null> {
        try {
            return await operation()
        } catch (error) {
            this.handle(error, context)
            return null
        }
    }

    public handleSync<T>(
        operation: () => T,
        context?: string
    ): T | null {
        try {
            return operation()
        } catch (error) {
            this.handle(error, context)
            return null
        }
    }
}

// Global error handler instance
export const errorHandler = new ErrorHandler()

// Hook to set up error handler with translations
export const useErrorHandler = (translate: TranslationFunction) => {
    errorHandler.setTranslationFunction(translate)
    return errorHandler
}

// Utility functions for creating errors
export const createValidationError = (message: string, errors: ValidationError[]): ValidationAppError => {
    return new ValidationAppError(message, errors)
}

export const createApiError = (message: string, status: number, code?: string): ApiError => {
    return new ApiError(message, status, code)
}

export const createAppError = (message: string, code?: string, field?: string, context?: Record<string, any>): AppError => {
    return new AppError(message, code, field, context)
}

// Error boundary helper
export const withErrorBoundary = <T extends (...args: any[]) => any>(
    fn: T,
    fallback?: (...args: Parameters<T>) => ReturnType<T>
): T => {
    return ((...args: Parameters<T>) => {
        try {
            return fn(...args)
        } catch (error) {
            errorHandler.handle(error, `Function: ${fn.name}`)
            return fallback ? fallback(...args) : undefined
        }
    }) as T
}

// Promise error boundary
export const withAsyncErrorBoundary = <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    fallback?: (...args: Parameters<T>) => ReturnType<T>
): T => {
    return (async (...args: Parameters<T>) => {
        try {
            return await fn(...args)
        } catch (error) {
            errorHandler.handle(error, `Async Function: ${fn.name}`)
            return fallback ? await fallback(...args) : undefined
        }
    }) as T
}
