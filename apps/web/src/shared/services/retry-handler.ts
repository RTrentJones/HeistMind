export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

export class RetryHandler {
  private static defaultOptions: RetryOptions = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryCondition: (error: unknown) => {
      // Retry on network errors, 5xx errors, and timeouts
      if (error instanceof Error) {
        return (
          error.name === 'NetworkError' ||
          error.name === 'TimeoutError' ||
          error.message.includes('fetch')
        );
      }
      return false;
    },
  };

  public static async withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const config = { ...this.defaultOptions, ...options };
    let lastError: unknown;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry if this is the last attempt or retry condition fails
        if (attempt === config.maxAttempts || !config.retryCondition?.(error)) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;

        config.onRetry?.(attempt, error);

        await this.sleep(jitteredDelay);
      }
    }

    throw lastError;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
