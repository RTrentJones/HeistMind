import { RetryHandler, RetryOptions } from './retry-handler';
import { CircuitBreaker, CircuitBreakerOptions, CircuitState } from './circuit-breaker';
import { errorHandler } from './error-handler';

export interface ResilienceOptions {
  retry?: Partial<RetryOptions>;
  circuitBreaker?: CircuitBreakerOptions;
  timeout?: number;
  enableLogging?: boolean;
}

export class ResilienceService {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  public async executeWithResilience<T>(
    operation: () => Promise<T>,
    options: ResilienceOptions = {},
    operationId?: string
  ): Promise<T> {
    const { retry, circuitBreaker, timeout, enableLogging = true } = options;

    let wrappedOperation = operation;

    // Add timeout if specified
    if (timeout) {
      wrappedOperation = this.withTimeout(wrappedOperation, timeout);
    }

    // Add circuit breaker if specified and operationId provided
    if (circuitBreaker && operationId) {
      const cb = this.getOrCreateCircuitBreaker(operationId, circuitBreaker);
      wrappedOperation = () => cb.execute(wrappedOperation);
    }

    // Add retry logic if specified
    if (retry) {
      const retryOptions: Partial<RetryOptions> = {
        ...retry,
        onRetry: enableLogging
          ? (attempt, error) => {
              console.warn(`Retry attempt ${attempt} for operation ${operationId}:`, error);
              retry.onRetry?.(attempt, error);
            }
          : retry.onRetry,
      };

      wrappedOperation = () => RetryHandler.withRetry(wrappedOperation, retryOptions);
    }

    try {
      const result = await wrappedOperation();

      if (enableLogging && operationId) {
        console.debug(`Operation ${operationId} completed successfully`);
      }

      return result;
    } catch (error) {
      if (enableLogging) {
        console.error(`Operation ${operationId} failed:`, error);
      }

      // Let the error handler process it
      errorHandler.handle(error, `ResilienceService:${operationId}`);
      throw error;
    }
  }

  private withTimeout<T>(operation: () => Promise<T>, timeoutMs: number): () => Promise<T> {
    return async () => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
      });

      return Promise.race([operation(), timeoutPromise]);
    };
  }

  private getOrCreateCircuitBreaker(id: string, options: CircuitBreakerOptions): CircuitBreaker {
    if (!this.circuitBreakers.has(id)) {
      this.circuitBreakers.set(id, new CircuitBreaker(options));
    }
    return this.circuitBreakers.get(id)!;
  }

  public getCircuitBreakerState(operationId: string): CircuitState | null {
    const cb = this.circuitBreakers.get(operationId);
    return cb ? cb.getState() : null;
  }

  public getCircuitBreakerMetrics(operationId: string) {
    const cb = this.circuitBreakers.get(operationId);
    return cb ? cb.getMetrics() : null;
  }

  public getAllCircuitBreakerMetrics() {
    const metrics: Record<string, ReturnType<CircuitBreaker['getMetrics']>> = {};
    for (const [id, cb] of this.circuitBreakers.entries()) {
      metrics[id] = cb.getMetrics();
    }
    return metrics;
  }
}

// Global resilience service instance
export const resilienceService = new ResilienceService();
