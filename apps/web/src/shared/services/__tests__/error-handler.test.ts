import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ErrorHandler,
  AppError,
  ValidationAppError,
  ApiError,
  createValidationError,
  createApiError,
  createAppError,
  withErrorBoundary,
  withAsyncErrorBoundary,
} from '../error-handler';
import { useNotificationStore } from '../../stores/notification-store';

// Mock the notification store
vi.mock('../../stores/notification-store', () => ({
  useNotificationStore: {
    getState: vi.fn(() => ({
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    })),
  },
}));

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockNotificationStore: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
    mockNotificationStore = {
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    };
    (useNotificationStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(
      mockNotificationStore
    );
    vi.clearAllMocks();
  });

  describe('Error Classes', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test message', 'TEST_CODE', 'testField', { key: 'value' });

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.field).toBe('testField');
      expect(error.context).toEqual({ key: 'value' });
      expect(error.name).toBe('AppError');
    });

    it('should create ValidationAppError with validation errors', () => {
      const validationErrors = [{ field: 'email', message: 'Invalid email' }];
      const error = new ValidationAppError('Validation failed', validationErrors);

      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.errors).toEqual(validationErrors);
      expect(error.name).toBe('ValidationAppError');
    });

    it('should create ApiError with status code', () => {
      const error = new ApiError('Server error', 500, 'INTERNAL_ERROR');

      expect(error.message).toBe('Server error');
      expect(error.status).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.name).toBe('ApiError');
    });
  });

  describe('Error Handling', () => {
    it('should handle ValidationAppError correctly', () => {
      const validationErrors = [{ field: 'email', message: 'Invalid email format' }];
      const error = new ValidationAppError('Validation failed', validationErrors);

      errorHandler.handle(error);

      expect(mockNotificationStore.error).toHaveBeenCalledWith(
        'Validation Error',
        'Invalid email format'
      );
    });

    it('should handle ApiError with different status codes', () => {
      const testCases = [
        { status: 401, expectedTitle: 'Error', expectedMessage: 'Unauthorized' },
        { status: 404, expectedTitle: 'Error', expectedMessage: 'Not found' },
        { status: 500, expectedTitle: 'Error', expectedMessage: 'Server error' },
      ];

      testCases.forEach(({ status, expectedTitle, expectedMessage }) => {
        const error = new ApiError(expectedMessage, status);
        errorHandler.handle(error);

        expect(mockNotificationStore.error).toHaveBeenCalledWith(expectedTitle, expectedMessage);
      });
    });

    it('should handle generic Error', () => {
      const error = new Error('Generic error message');

      errorHandler.handle(error);

      expect(mockNotificationStore.error).toHaveBeenCalledWith('Error', 'Generic error message');
    });

    it('should handle unknown errors', () => {
      const error = 'String error';

      errorHandler.handle(error);

      expect(mockNotificationStore.error).toHaveBeenCalledWith(
        'Unexpected Error',
        'An unexpected error occurred'
      );
    });
  });

  describe('Translation Support', () => {
    it('should use translation function when available', () => {
      const mockTranslate = vi.fn((key: string) => `Translated: ${key}`);
      errorHandler.setTranslationFunction(mockTranslate);

      const error = new AppError('Test error');
      errorHandler.handle(error);

      expect(mockTranslate).toHaveBeenCalledWith('errors.general');
      expect(mockNotificationStore.error).toHaveBeenCalledWith(
        'Translated: errors.general',
        'Test error'
      );
    });
  });

  describe('Async Operations', () => {
    it('should handle successful async operations', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await errorHandler.handleAsync(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
      expect(mockNotificationStore.error).not.toHaveBeenCalled();
    });

    it('should handle failed async operations', async () => {
      const error = new Error('Async error');
      const operation = vi.fn().mockRejectedValue(error);

      const result = await errorHandler.handleAsync(operation, 'test-context');

      expect(result).toBeNull();
      expect(mockNotificationStore.error).toHaveBeenCalled();
    });
  });

  describe('Sync Operations', () => {
    it('should handle successful sync operations', () => {
      const operation = vi.fn().mockReturnValue('success');

      const result = errorHandler.handleSync(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
      expect(mockNotificationStore.error).not.toHaveBeenCalled();
    });

    it('should handle failed sync operations', () => {
      const error = new Error('Sync error');
      const operation = vi.fn().mockImplementation(() => {
        throw error;
      });

      const result = errorHandler.handleSync(operation, 'test-context');

      expect(result).toBeNull();
      expect(mockNotificationStore.error).toHaveBeenCalled();
    });
  });
});

describe('Error Creation Utilities', () => {
  it('should create validation error correctly', () => {
    const validationErrors = [{ field: 'name', message: 'Required' }];
    const error = createValidationError('Validation failed', validationErrors);

    expect(error).toBeInstanceOf(ValidationAppError);
    expect(error.message).toBe('Validation failed');
    expect(error.errors).toEqual(validationErrors);
  });

  it('should create API error correctly', () => {
    const error = createApiError('Not found', 404, 'NOT_FOUND');

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Not found');
    expect(error.status).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });

  it('should create app error correctly', () => {
    const error = createAppError('App error', 'APP_ERROR', 'field', { context: 'test' });

    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe('App error');
    expect(error.code).toBe('APP_ERROR');
    expect(error.field).toBe('field');
    expect(error.context).toEqual({ context: 'test' });
  });
});

describe('Error Boundaries', () => {
  it('should wrap function with error boundary', () => {
    const mockFn = vi.fn().mockImplementation(() => {
      throw new Error('Test error');
    });
    const fallback = vi.fn().mockReturnValue('fallback');

    const wrappedFn = withErrorBoundary(mockFn, fallback);
    const result = wrappedFn();

    expect(result).toBe('fallback');
    expect(mockNotificationStore.error).toHaveBeenCalled();
  });

  it('should wrap async function with error boundary', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Async test error'));
    const fallback = vi.fn().mockResolvedValue('async fallback');

    const wrappedFn = withAsyncErrorBoundary(mockFn, fallback);
    const result = await wrappedFn();

    expect(result).toBe('async fallback');
    expect(mockNotificationStore.error).toHaveBeenCalled();
  });
});
