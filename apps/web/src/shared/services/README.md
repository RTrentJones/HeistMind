# Error Handling & Resilience Infrastructure

This directory contains a comprehensive error handling and resilience infrastructure for the HeistMind platform. The system provides robust error management, automatic retry mechanisms, circuit breakers, and graceful degradation patterns.

## Overview

The infrastructure consists of several key components:

1. **Error Handler** - Centralized error processing with user notifications
2. **Retry Handler** - Configurable retry logic with exponential backoff
3. **Circuit Breaker** - Prevents cascading failures in distributed systems
4. **Resilience Service** - Orchestrates multiple resilience patterns
5. **Error Boundary** - React component for catching and handling UI errors
6. **Enhanced API Client** - Integrated with resilience patterns

## Key Features

- 🔄 **Automatic Retries** with exponential backoff and jitter
- ⚡ **Circuit Breakers** to prevent cascading failures
- 🛡️ **Error Boundaries** for React component error handling
- 🌐 **Internationalization** support for error messages
- 📊 **Monitoring** and metrics for resilience patterns
- 🎯 **Graceful Degradation** patterns
- 🔧 **Configurable** retry and circuit breaker policies

## Quick Start

### Basic Error Handling

```typescript
import { errorHandler, createAppError } from '@/shared/services';

// Handle errors with automatic user notifications
try {
  // Some operation that might fail
  await riskyOperation();
} catch (error) {
  errorHandler.handle(error, 'user-profile-update');
}

// Create typed errors
throw createAppError('User not found', 'USER_NOT_FOUND', 'userId');
```

### API Calls with Resilience

```typescript
import { apiClient } from '@/shared/services';

// API client automatically includes retry and circuit breaker logic
const user = await apiClient.get('/users/123');
```

### Custom Resilient Operations

```typescript
import { resilienceService } from '@/shared/services';

const result = await resilienceService.executeWithResilience(
  async () => {
    // Your operation here
    return await someExternalService();
  },
  {
    retry: {
      maxAttempts: 3,
      baseDelay: 1000,
    },
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
    },
    timeout: 10000,
  },
  'external-service-call'
);
```

### Error Boundaries in React

```tsx
import { ErrorBoundary } from '@/shared/components';

function App() {
  return (
    <ErrorBoundary
      fallback={<div>Something went wrong. Please try again.</div>}
      onError={(error, errorInfo) => {
        console.error('App error:', error, errorInfo);
      }}
    >
      <YourComponent />
    </ErrorBoundary>
  );
}
```

## Components

### Error Handler (`error-handler.ts`)

Centralized error processing with support for:

- Different error types (App, Validation, API errors)
- Automatic user notifications via the notification store
- Internationalization support
- Context-aware error logging

**Key Classes:**

- `AppError` - Base application error
- `ValidationAppError` - Validation-specific errors
- `ApiError` - HTTP/API errors
- `ErrorHandler` - Main error processing class

### Retry Handler (`retry-handler.ts`)

Implements retry logic with:

- Exponential backoff with jitter
- Configurable retry conditions
- Maximum delay limits
- Retry attempt callbacks

### Circuit Breaker (`circuit-breaker.ts`)

Prevents cascading failures with:

- Configurable failure thresholds
- Automatic state transitions (CLOSED → OPEN → HALF_OPEN)
- Reset timeouts
- Metrics and monitoring

### Resilience Service (`resilience-service.ts`)

Orchestrates multiple resilience patterns:

- Combines retry, circuit breaker, and timeout logic
- Operation-specific configuration
- Centralized monitoring and metrics
- Logging and debugging support

### Error Boundary (`error-boundary.tsx`)

React component for UI error handling:

- Catches JavaScript errors in component trees
- Provides fallback UI
- Supports error recovery
- Hook-based API for functional components

## Configuration

### Default API Client Configuration

The default API client includes resilience configuration:

```typescript
{
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
  },
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30000,
    monitoringPeriod: 60000,
  },
  timeout: 15000,
}
```

### Custom Configuration

You can override default settings:

```typescript
const customApiClient = new ApiClient({
  baseUrl: '/api',
  resilience: {
    retry: {
      maxAttempts: 5,
      baseDelay: 2000,
    },
    // ... other options
  },
});
```

## Error Types

### AppError

Base error class for application-specific errors.

```typescript
const error = new AppError('User not found', 'USER_NOT_FOUND', 'userId', { userId: '123' });
```

### ValidationAppError

For validation failures with detailed field errors.

```typescript
const error = new ValidationAppError('Validation failed', [
  { field: 'email', message: 'Invalid email format' },
  { field: 'password', message: 'Password too short' },
]);
```

### ApiError

For HTTP/API related errors.

```typescript
const error = new ApiError('Not found', 404, 'RESOURCE_NOT_FOUND');
```

## Monitoring and Metrics

### Circuit Breaker Metrics

```typescript
import { resilienceService } from '@/shared/services';

// Get metrics for a specific operation
const metrics = resilienceService.getCircuitBreakerMetrics('api-call');

// Get all circuit breaker metrics
const allMetrics = resilienceService.getAllCircuitBreakerMetrics();
```

### Health Checks

```typescript
import { getSystemHealth } from '@/shared/services/examples/resilience-examples';

const health = getSystemHealth();
console.log('System health:', health);
```

## Best Practices

### 1. Use Appropriate Error Types

- Use `ValidationAppError` for form validation
- Use `ApiError` for HTTP errors
- Use `AppError` for business logic errors

### 2. Configure Retry Conditions

Only retry on transient failures:

```typescript
retryCondition: error => {
  if (error instanceof ApiError) {
    // Retry on server errors and timeouts, not client errors
    return error.status >= 500 || error.status === 0 || error.status === 408;
  }
  return false;
};
```

### 3. Set Appropriate Timeouts

- Short timeouts for user-facing operations (5-10s)
- Longer timeouts for background operations (30-60s)
- Consider user experience and system resources

### 4. Use Circuit Breakers for External Services

Protect your system from external service failures:

```typescript
circuitBreaker: {
  failureThreshold: 5,
  resetTimeout: 30000,
  expectedErrors: (error) => {
    // Only break on actual service failures
    return error instanceof ApiError && error.status >= 500;
  },
}
```

### 5. Implement Graceful Degradation

Always have fallback strategies:

```typescript
try {
  return await primaryService();
} catch (error) {
  console.warn('Primary service failed, using fallback');
  return await fallbackService();
}
```

## Testing

The infrastructure includes comprehensive tests:

- Unit tests for all components
- Integration tests for resilience patterns
- Mock implementations for testing

Run tests with:

```bash
npm test shared/services
```

## Examples

See `examples/resilience-examples.ts` for comprehensive usage examples including:

- Basic API calls with resilience
- Custom resilient operations
- Circuit breaker patterns
- Error boundary usage
- Graceful degradation
- Monitoring and health checks

## Integration with Other Systems

### Notification System

Errors are automatically displayed to users via the notification store.

### Internationalization

Error messages support i18n through the translation function injection.

### Logging

All errors are logged with context for debugging and monitoring.

### Metrics

Circuit breaker and retry metrics can be integrated with monitoring systems.

## Migration Guide

If you have existing error handling code:

1. Replace manual try-catch blocks with `errorHandler.handle()`
2. Use typed error classes instead of generic `Error`
3. Wrap API calls with resilience patterns
4. Add error boundaries to React components
5. Configure appropriate retry and circuit breaker policies

## Performance Considerations

- Retry delays add latency - configure appropriately
- Circuit breakers prevent resource waste on failing services
- Error boundaries prevent entire app crashes
- Monitoring has minimal overhead but provides valuable insights

## Security Considerations

- Don't expose sensitive information in error messages
- Log security-related errors for monitoring
- Use appropriate error codes for different failure types
- Consider rate limiting for retry mechanisms
