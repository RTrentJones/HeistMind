import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Class name utility for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Date formatting utilities
export const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

export const formatDateTime = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export const formatRelativeTime = (date: Date | string) => {
    const now = new Date()
    const d = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`

    return formatDate(d)
}

// String utilities
export const truncate = (str: string, length: number) => {
    if (str.length <= length) return str
    return str.slice(0, length) + '...'
}

export const slugify = (str: string) => {
    return str
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

export const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

// Array utilities
export const unique = <T>(array: T[]): T[] => [...new Set(array)]

export const groupBy = <T, K extends keyof any>(
    array: T[],
    key: (item: T) => K
): Record<K, T[]> => {
    return array.reduce((result, item) => {
        const group = key(item)
        if (!result[group]) {
            result[group] = []
        }
        result[group].push(item)
        return result
    }, {} as Record<K, T[]>)
}

// Object utilities
export const omit = <T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[]
): Omit<T, K> => {
    const result = { ...obj }
    keys.forEach((key) => delete result[key])
    return result
}

export const pick = <T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[]
): Pick<T, K> => {
    const result = {} as Pick<T, K>
    keys.forEach((key) => {
        if (key in obj) {
            result[key] = obj[key]
        }
    })
    return result
}

// Validation utilities
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

export const isValidUrl = (url: string): boolean => {
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

// Async utilities
export const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void => {
    let timeoutId: NodeJS.Timeout
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => func.apply(null, args), delay)
    }
}

export const throttle = <T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void => {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func.apply(null, args)
            inThrottle = true
            setTimeout(() => (inThrottle = false), limit)
        }
    }
}

// Local storage utilities with error handling
export const storage = {
    get: <T>(key: string, defaultValue?: T): T | null => {
        try {
            const item = localStorage.getItem(key)
            return item ? JSON.parse(item) : defaultValue ?? null
        } catch {
            return defaultValue ?? null
        }
    },
    set: (key: string, value: any): void => {
        try {
            localStorage.setItem(key, JSON.stringify(value))
        } catch {
            // Silently fail if localStorage is not available
        }
    },
    remove: (key: string): void => {
        try {
            localStorage.removeItem(key)
        } catch {
            // Silently fail if localStorage is not available
        }
    },
}

// Form data utilities
export const createFormData = (data: Record<string, any>): FormData => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            if (value instanceof File) {
                formData.append(key, value)
            } else if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    formData.append(`${key}[${index}]`, item)
                })
            } else {
                formData.append(key, String(value))
            }
        }
    })
    return formData
}
