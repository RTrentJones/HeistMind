import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitState } from '../circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
      monitoringPeriod: 5000,
      expectedErrors: () => true,
    });
    vi.clearAllMocks();
  });

  it('should start in CLOSED state', () => {
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should execute operation successfully when CLOSED', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await circuitBreaker.execute(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should transition to OPEN after failure threshold', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Test error'));

    // Fail 3 times to reach threshold
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(operation);
      } catch (_error) {
        // Expected to fail
      }
    }

    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should reject immediately when OPEN', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Test error'));

    // Trigger circuit to open
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(operation);
      } catch (_error) {
        // Expected to fail
      }
    }

    // Now circuit should be open and reject immediately
    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');

    // Operation should not have been called again
    expect(operation).toHaveBeenCalledTimes(3); // Only the initial 3 calls
  });

  it('should transition to HALF_OPEN after reset timeout', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Test error'));

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(operation);
      } catch (_error) {
        // Expected to fail
      }
    }

    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

    // Wait for reset timeout (using a shorter timeout for testing)
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 10, // Very short for testing
      monitoringPeriod: 5000,
      expectedErrors: () => true,
    });

    // Open the circuit again with new instance
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(operation);
      } catch (_error) {
        // Expected to fail
      }
    }

    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 20));

    // Next call should transition to HALF_OPEN
    const successOperation = vi.fn().mockResolvedValue('success');
    await circuitBreaker.execute(successOperation);

    expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
  });

  it('should transition from HALF_OPEN to CLOSED after successful operations', async () => {
    // Create circuit breaker with shorter timeout for testing
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeout: 10,
      monitoringPeriod: 5000,
      expectedErrors: () => true,
    });

    const failOperation = vi.fn().mockRejectedValue(new Error('Test error'));
    const successOperation = vi.fn().mockResolvedValue('success');

    // Open the circuit
    for (let i = 0; i < 2; i++) {
      try {
        await circuitBreaker.execute(failOperation);
      } catch (_error) {
        // Expected to fail
      }
    }

    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 20));

    // Execute 3 successful operations to close the circuit
    for (let i = 0; i < 3; i++) {
      await circuitBreaker.execute(successOperation);
    }

    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should not count non-expected errors', async () => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
      monitoringPeriod: 5000,
      expectedErrors: error => error instanceof Error && error.message === 'expected',
    });

    const unexpectedOperation = vi.fn().mockRejectedValue(new Error('unexpected'));
    const expectedOperation = vi.fn().mockRejectedValue(new Error('expected'));

    // Fail with unexpected errors - should not count
    for (let i = 0; i < 5; i++) {
      try {
        await circuitBreaker.execute(unexpectedOperation);
      } catch (_error) {
        // Expected to fail
      }
    }

    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

    // Now fail with expected errors - should count
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(expectedOperation);
      } catch (_error) {
        // Expected to fail
      }
    }

    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should provide correct metrics', () => {
    const metrics = circuitBreaker.getMetrics();

    expect(metrics).toEqual({
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
    });
  });
});
