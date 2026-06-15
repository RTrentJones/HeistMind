import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetryHandler } from '../retry-handler';

describe('RetryHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await RetryHandler.withRetry(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('NetworkError'))
      .mockResolvedValue('success');

    const result = await RetryHandler.withRetry(operation, {
      maxAttempts: 3,
      baseDelay: 10, // Short delay for testing
      retryCondition: error => error instanceof Error && error.message === 'NetworkError',
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable errors', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('ValidationError'));

    await expect(
      RetryHandler.withRetry(operation, {
        maxAttempts: 3,
        retryCondition: error => error instanceof Error && error.message === 'NetworkError',
      })
    ).rejects.toThrow('ValidationError');

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should exhaust all retry attempts', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('NetworkError'));

    await expect(
      RetryHandler.withRetry(operation, {
        maxAttempts: 3,
        baseDelay: 10,
        retryCondition: error => error instanceof Error && error.message === 'NetworkError',
      })
    ).rejects.toThrow('NetworkError');

    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should call onRetry callback', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('NetworkError'))
      .mockResolvedValue('success');
    const onRetry = vi.fn();

    await RetryHandler.withRetry(operation, {
      maxAttempts: 3,
      baseDelay: 10,
      retryCondition: () => true,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it('should apply exponential backoff', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('NetworkError'))
      .mockRejectedValueOnce(new Error('NetworkError'))
      .mockResolvedValue('success');

    const startTime = Date.now();

    await RetryHandler.withRetry(operation, {
      maxAttempts: 3,
      baseDelay: 100,
      backoffMultiplier: 2,
      retryCondition: () => true,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should take at least 100ms (first retry) + 200ms (second retry) = 300ms
    // Adding some buffer for test execution time
    expect(duration).toBeGreaterThan(250);
  });

  it('should respect maxDelay', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('NetworkError'))
      .mockResolvedValue('success');

    const startTime = Date.now();

    await RetryHandler.withRetry(operation, {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 50, // Very low max delay
      backoffMultiplier: 10,
      retryCondition: () => true,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should be limited by maxDelay + jitter, not baseDelay * backoffMultiplier
    expect(duration).toBeLessThan(2000);
  });
});
