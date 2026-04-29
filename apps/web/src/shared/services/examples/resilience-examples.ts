/**
 * Examples demonstrating how to use the Error Handling & Resilience Infrastructure
 *
 * This file contains practical examples of how to implement resilient operations
 * using the error handling, retry, circuit breaker, and resilience services.
 */

import {
  resilienceService,
  RetryHandler,
  CircuitBreaker,
  createApiError,
  createAppError,
  withErrorBoundary,
  withAsyncErrorBoundary,
} from '../index';
import { apiClient } from '../api-client';

// Example 1: Basic API call with automatic resilience
export const fetchUserProfile = async (userId: string) => {
  return apiClient.get(`/users/${userId}`);
};

// Example 2: Custom resilient operation
export const fetchCriticalData = async (dataId: string) => {
  return resilienceService.executeWithResilience(
    async () => {
      const response = await fetch(`/api/critical-data/${dataId}`);
      if (!response.ok) {
        throw createApiError('Failed to fetch critical data', response.status);
      }
      return response.json();
    },
    {
      retry: {
        maxAttempts: 5,
        baseDelay: 2000,
        maxDelay: 30000,
        backoffMultiplier: 2,
      },
      circuitBreaker: {
        failureThreshold: 3,
        resetTimeout: 60000,
        monitoringPeriod: 300000,
      },
      timeout: 30000,
    },
    'fetch-critical-data'
  );
};

// Example 3: Manual retry with custom logic
export const uploadFileWithRetry = async (file: File) => {
  return RetryHandler.withRetry(
    async () => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw createApiError('Upload failed', response.status);
      }

      return response.json();
    },
    {
      maxAttempts: 3,
      baseDelay: 1000,
      retryCondition: (error: unknown) => {
        // Retry on network errors and 5xx server errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          return status >= 500 || status === 0;
        }
        return false;
      },
      onRetry: (attempt, error) => {
        console.log(`Upload attempt ${attempt} failed:`, error);
      },
    }
  );
};

// Example 4: Circuit breaker for external service
const externalServiceCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000,
  monitoringPeriod: 60000,
  expectedErrors: (error: unknown) => {
    // Only break circuit on actual service failures, not client errors
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      return status >= 500;
    }
    return true; // Break on any other errors
  },
});

export const callExternalService = async (data: unknown) => {
  return externalServiceCircuitBreaker.execute(async () => {
    const response = await fetch('https://external-api.example.com/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw createApiError('External service error', response.status);
    }

    return response.json();
  });
};

// Example 5: Error boundary for component functions
export const processUserData = withErrorBoundary(
  (userData: Record<string, unknown>) => {
    if (!userData.email) {
      throw createAppError('Email is required', 'MISSING_EMAIL', 'email');
    }

    // Process the data
    return {
      ...userData,
      processedAt: new Date().toISOString(),
    };
  },
  (userData: Record<string, unknown>) => {
    // Fallback function
    console.warn('Failed to process user data, using fallback');
    return {
      ...userData,
      processedAt: new Date().toISOString(),
      hasErrors: true,
    };
  }
);

// Example 6: Async error boundary for async operations
export const saveUserPreferences = withAsyncErrorBoundary(
  async (preferences: Record<string, unknown>) => {
    const response = await apiClient.post('/user/preferences', preferences);
    return response.data;
  },
  async (preferences: Record<string, unknown>) => {
    // Fallback: save to local storage
    console.warn('Failed to save preferences to server, saving locally');
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
    return { saved: 'locally', preferences };
  }
);

// Example 7: Complex operation with multiple resilience patterns
export const complexDataOperation = async (operationData: Record<string, unknown>) => {
  return resilienceService.executeWithResilience(
    async () => {
      // Step 1: Validate data
      if (!operationData.id) {
        throw createAppError('Operation ID is required', 'MISSING_ID');
      }

      // Step 2: Fetch related data with its own resilience
      const relatedData = await resilienceService.executeWithResilience(
        () => apiClient.get(`/related-data/${operationData.id}`),
        {
          retry: { maxAttempts: 2, baseDelay: 500 },
          timeout: 5000,
        },
        'fetch-related-data'
      );

      // Step 3: Process the data
      const processedData = processUserData({
        ...operationData,
        related: relatedData.data,
      });

      // Step 4: Save the result
      const result = await apiClient.post('/processed-data', processedData);

      return result.data;
    },
    {
      retry: {
        maxAttempts: 3,
        baseDelay: 1000,
        retryCondition: (error: unknown) => {
          // Don't retry validation errors
          if (error && typeof error === 'object' && 'code' in error) {
            return (error as { code: string }).code !== 'MISSING_ID';
          }
          return true;
        },
      },
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 60000,
        monitoringPeriod: 300000,
      },
      timeout: 30000,
    },
    'complex-data-operation'
  );
};

// Example 8: Monitoring circuit breaker states
export const getSystemHealth = () => {
  const circuitBreakerMetrics = resilienceService.getAllCircuitBreakerMetrics();

  return {
    timestamp: new Date().toISOString(),
    circuitBreakers: circuitBreakerMetrics,
    externalService: externalServiceCircuitBreaker.getMetrics(),
  };
};

// Example 9: Graceful degradation pattern
export const getRecommendations = async (userId: string) => {
  try {
    // Try to get personalized recommendations
    return await resilienceService.executeWithResilience(
      () => apiClient.get(`/recommendations/personalized/${userId}`),
      {
        retry: { maxAttempts: 2, baseDelay: 1000 },
        timeout: 5000,
      },
      'personalized-recommendations'
    );
  } catch (_error) {
    console.warn('Personalized recommendations failed, falling back to general recommendations');

    try {
      // Fallback to general recommendations
      return await apiClient.get('/recommendations/general');
    } catch (_fallbackError) {
      console.warn('General recommendations also failed, using cached data');

      // Final fallback to cached data
      const cached = localStorage.getItem('cachedRecommendations');
      return cached ? JSON.parse(cached) : { data: [] };
    }
  }
};

// Example 10: Error handling with user feedback
export const performCriticalAction = async (actionData: Record<string, unknown>) => {
  try {
    return await resilienceService.executeWithResilience(
      () => apiClient.post('/critical-action', actionData),
      {
        retry: {
          maxAttempts: 3,
          baseDelay: 2000,
          onRetry: attempt => {
            // Show user that we're retrying
            console.log(`Retrying critical action (attempt ${attempt})...`);
          },
        },
        circuitBreaker: {
          failureThreshold: 3,
          resetTimeout: 30000,
          monitoringPeriod: 60000,
        },
      },
      'critical-action'
    );
  } catch (error) {
    // The error handler will automatically show user notifications
    // but we can also add custom logic here
    console.error('Critical action failed after all retries:', error);

    // Maybe trigger a different workflow or save for later
    localStorage.setItem(
      'failedCriticalAction',
      JSON.stringify({
        actionData,
        failedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );

    throw error; // Re-throw so the error handler can process it
  }
};
