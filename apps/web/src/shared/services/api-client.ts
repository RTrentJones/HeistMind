import { ApiResponse, PaginatedApiResponse } from '../types';
import { resilienceService, ResilienceOptions } from './resilience-service';
import { createApiError } from './error-handler';

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  defaultHeaders?: Record<string, string>;
  resilience?: ResilienceOptions;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

export class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;
  private resilienceOptions?: ResilienceOptions;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeout = config.timeout || 10000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.defaultHeaders,
    };
    this.resilienceOptions = config.resilience;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const operationId = `${method}:${endpoint}`;

    const operation = async (): Promise<ApiResponse<T>> => {
      const url = `${this.baseUrl}${endpoint}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options?.timeout || this.timeout);

      try {
        const response = await fetch(url, {
          method,
          headers: {
            ...this.defaultHeaders,
            ...options?.headers,
          },
          body: data ? JSON.stringify(data) : undefined,
          signal: options?.signal || controller.signal,
        });

        clearTimeout(timeoutId);

        const responseData = await response.json();

        if (!response.ok) {
          throw createApiError(
            responseData.message || `HTTP ${response.status}`,
            response.status,
            responseData.code
          );
        }

        return responseData;
      } catch (error) {
        clearTimeout(timeoutId);

        // Convert fetch errors to proper API errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw createApiError('Network error occurred', 0, 'NETWORK_ERROR');
        }

        if (error instanceof DOMException && error.name === 'AbortError') {
          throw createApiError('Request timeout', 408, 'TIMEOUT');
        }

        throw error;
      }
    };

    // Use resilience service if configured
    if (this.resilienceOptions) {
      return resilienceService.executeWithResilience(
        operation,
        this.resilienceOptions,
        operationId
      );
    }

    return operation();
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async post<T>(
    endpoint: string,
    data?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, options);
  }

  async put<T>(
    endpoint: string,
    data?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  async patch<T>(
    endpoint: string,
    data?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  async getPaginated<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<PaginatedApiResponse<T[]>> {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }

    const url = searchParams.toString() ? `${endpoint}?${searchParams}` : endpoint;
    return this.request<T[]>('GET', url, undefined, options) as Promise<PaginatedApiResponse<T[]>>;
  }

  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  removeAuthToken() {
    delete this.defaultHeaders['Authorization'];
  }
}

// Default API client instance with resilience configuration
export const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 10000,
  resilience: {
    retry: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2,
      retryCondition: (error: unknown) => {
        // Retry on network errors, timeouts, and 5xx server errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          return status >= 500 || status === 0 || status === 408;
        }
        return false;
      },
    },
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000, // 30 seconds
      monitoringPeriod: 60000, // 1 minute
      expectedErrors: (error: unknown) => {
        // Only break circuit on server errors, not client errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          return status >= 500;
        }
        return false;
      },
    },
    timeout: 15000, // 15 second timeout for resilient operations
    enableLogging: process.env.NODE_ENV === 'development',
  },
});
