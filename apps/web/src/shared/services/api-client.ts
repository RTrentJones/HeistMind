import { ApiResponse, PaginatedApiResponse } from '../types'

export interface ApiClientConfig {
    baseUrl: string
    timeout?: number
    defaultHeaders?: Record<string, string>
}

export interface RequestOptions {
    headers?: Record<string, string>
    timeout?: number
    signal?: AbortSignal
}

export class ApiClient {
    private baseUrl: string
    private timeout: number
    private defaultHeaders: Record<string, string>

    constructor(config: ApiClientConfig) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '')
        this.timeout = config.timeout || 10000
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            ...config.defaultHeaders,
        }
    }

    private async request<T>(
        method: string,
        endpoint: string,
        data?: Record<string, unknown>,
        options?: RequestOptions
    ): Promise<ApiResponse<T>> {
        const url = `${this.baseUrl}${endpoint}`
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), options?.timeout || this.timeout)

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    ...this.defaultHeaders,
                    ...options?.headers,
                },
                body: data ? JSON.stringify(data) : undefined,
                signal: options?.signal || controller.signal,
            })

            clearTimeout(timeoutId)

            const responseData = await response.json()

            if (!response.ok) {
                throw new Error(responseData.message || `HTTP ${response.status}`)
            }

            return responseData
        } catch (error) {
            clearTimeout(timeoutId)
            throw error
        }
    }

    async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
        return this.request<T>('GET', endpoint, undefined, options)
    }

    async post<T>(endpoint: string, data?: Record<string, unknown>, options?: RequestOptions): Promise<ApiResponse<T>> {
        return this.request<T>('POST', endpoint, data, options)
    }

    async put<T>(endpoint: string, data?: Record<string, unknown>, options?: RequestOptions): Promise<ApiResponse<T>> {
        return this.request<T>('PUT', endpoint, data, options)
    }

    async patch<T>(endpoint: string, data?: Record<string, unknown>, options?: RequestOptions): Promise<ApiResponse<T>> {
        return this.request<T>('PATCH', endpoint, data, options)
    }

    async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
        return this.request<T>('DELETE', endpoint, undefined, options)
    }

    async getPaginated<T>(
        endpoint: string,
        params?: Record<string, unknown>,
        options?: RequestOptions
    ): Promise<PaginatedApiResponse<T[]>> {
        const searchParams = new URLSearchParams()

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value))
                }
            })
        }

        const url = searchParams.toString() ? `${endpoint}?${searchParams}` : endpoint
        return this.request<T[]>('GET', url, undefined, options) as Promise<PaginatedApiResponse<T[]>>
    }

    setAuthToken(token: string) {
        this.defaultHeaders['Authorization'] = `Bearer ${token}`
    }

    removeAuthToken() {
        delete this.defaultHeaders['Authorization']
    }
}

// Default API client instance
export const apiClient = new ApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
    timeout: 10000,
})
