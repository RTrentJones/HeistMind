/**
 * @vitest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useValidation } from '../useValidation';

describe('useValidation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useValidation({}));

      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(true);
      expect(result.current.isValidating).toBe(false);
      expect(typeof result.current.validate).toBe('function');
      expect(typeof result.current.clearErrors).toBe('function');
      expect(typeof result.current.setFieldError).toBe('function');
    });

    it('should validate initial data with rules', async () => {
      const rules = {
        name: (value: string) => (value ? null : 'Name is required'),
        email: (value: string) => (value.includes('@') ? null : 'Invalid email'),
      };

      const { result } = renderHook(() => useValidation({ name: '', email: 'invalid' }, rules));

      await act(async () => {
        await result.current.validate();
      });

      expect(result.current.errors.name).toBe('Name is required');
      expect(result.current.errors.email).toBe('Invalid email');
      expect(result.current.isValid).toBe(false);
    });

    it('should pass validation with valid data', async () => {
      const rules = {
        name: (value: string) => (value ? null : 'Name is required'),
        email: (value: string) => (value.includes('@') ? null : 'Invalid email'),
      };

      const { result } = renderHook(() =>
        useValidation({ name: 'John', email: 'john@example.com' }, rules)
      );

      await act(async () => {
        await result.current.validate();
      });

      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Field Validation', () => {
    it('should validate individual fields', async () => {
      const rules = {
        name: (value: string) => (value ? null : 'Name is required'),
        email: (value: string) => (value.includes('@') ? null : 'Invalid email'),
      };

      const { result } = renderHook(() => useValidation({ name: 'John', email: '' }, rules));

      await act(async () => {
        await result.current.validateField('email', 'invalid-email');
      });

      expect(result.current.errors.email).toBe('Invalid email');
      expect(result.current.errors.name).toBeUndefined();
    });

    it('should clear field errors when validation passes', async () => {
      const rules = {
        email: (value: string) => (value.includes('@') ? null : 'Invalid email'),
      };

      const { result } = renderHook(() => useValidation({ email: '' }, rules));

      // First, create an error
      await act(async () => {
        await result.current.validateField('email', 'invalid');
      });
      expect(result.current.errors.email).toBe('Invalid email');

      // Then fix it
      await act(async () => {
        await result.current.validateField('email', 'valid@example.com');
      });
      expect(result.current.errors.email).toBeUndefined();
    });

    it('should handle validation of non-existent fields gracefully', async () => {
      const rules = {
        name: (value: string) => (value ? null : 'Name is required'),
      };

      const { result } = renderHook(() => useValidation({ name: 'John' }, rules));

      await act(async () => {
        // @ts-expect-error - Testing invalid field
        await result.current.validateField('nonexistent', 'value');
      });

      expect(result.current.errors).toEqual({});
    });
  });

  describe('Error Management', () => {
    it('should manually set field errors', () => {
      const { result } = renderHook(() => useValidation({}));

      act(() => {
        result.current.setFieldError('email', 'Custom error message');
      });

      expect(result.current.errors.email).toBe('Custom error message');
      expect(result.current.isValid).toBe(false);
    });

    it('should clear all errors', async () => {
      const rules = {
        name: (value: string) => (value ? null : 'Name is required'),
        email: (value: string) => (value.includes('@') ? null : 'Invalid email'),
      };

      const { result } = renderHook(() => useValidation({ name: '', email: 'invalid' }, rules));

      // Create errors
      await act(async () => {
        await result.current.validate();
      });
      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

      // Clear them
      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(true);
    });

    it('should clear specific field errors', () => {
      const { result } = renderHook(() => useValidation({}));

      act(() => {
        result.current.setFieldError('name', 'Name error');
        result.current.setFieldError('email', 'Email error');
      });

      expect(result.current.errors.name).toBe('Name error');
      expect(result.current.errors.email).toBe('Email error');

      act(() => {
        result.current.clearErrors('name');
      });

      expect(result.current.errors.name).toBeUndefined();
      expect(result.current.errors.email).toBe('Email error');
    });
  });

  describe('Async Validation', () => {
    it('should handle async validation rules', async () => {
      const asyncRule = async (value: string) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return value === 'taken' ? 'Username already taken' : null;
      };

      const rules = {
        username: asyncRule,
      };

      const { result } = renderHook(() => useValidation({ username: 'taken' }, rules));

      act(() => {
        result.current.validate();
      });

      expect(result.current.isValidating).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(100);
        await Promise.resolve(); // Allow async validation to complete
      });

      expect(result.current.isValidating).toBe(false);
      expect(result.current.errors.username).toBe('Username already taken');
    });

    it('should handle async field validation', async () => {
      const asyncRule = async (value: string) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return value.length < 3 ? 'Too short' : null;
      };

      const rules = {
        username: asyncRule,
      };

      const { result } = renderHook(() => useValidation({ username: '' }, rules));

      act(() => {
        result.current.validateField('username', 'ab');
      });

      expect(result.current.isValidating).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(50);
        await Promise.resolve();
      });

      expect(result.current.isValidating).toBe(false);
      expect(result.current.errors.username).toBe('Too short');
    });

    it('should handle multiple concurrent async validations', async () => {
      const asyncRule1 = async (value: string) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return value === 'error1' ? 'Error 1' : null;
      };

      const asyncRule2 = async (value: string) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return value === 'error2' ? 'Error 2' : null;
      };

      const rules = {
        field1: asyncRule1,
        field2: asyncRule2,
      };

      const { result } = renderHook(() =>
        useValidation({ field1: 'error1', field2: 'error2' }, rules)
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.isValidating).toBe(true);

      // Advance time for the faster validation
      await act(async () => {
        vi.advanceTimersByTime(50);
        await Promise.resolve();
      });

      expect(result.current.isValidating).toBe(true); // Still validating the slower one

      // Advance time for the slower validation
      await act(async () => {
        vi.advanceTimersByTime(50);
        await Promise.resolve();
      });

      expect(result.current.isValidating).toBe(false);
      expect(result.current.errors.field1).toBe('Error 1');
      expect(result.current.errors.field2).toBe('Error 2');
    });
  });

  describe('Validation State', () => {
    it('should correctly track isValid state', async () => {
      const rules = {
        name: (value: string) => (value ? null : 'Required'),
      };

      const { result } = renderHook(() => useValidation({ name: '' }, rules));

      expect(result.current.isValid).toBe(true); // Initially true

      await act(async () => {
        await result.current.validate();
      });

      expect(result.current.isValid).toBe(false); // False after failed validation

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.isValid).toBe(true); // True after clearing errors
    });

    it('should track isValidating state during async operations', async () => {
      const asyncRule = async (value: string) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return null;
      };

      const rules = {
        field: asyncRule,
      };

      const { result } = renderHook(() => useValidation({ field: 'test' }, rules));

      expect(result.current.isValidating).toBe(false);

      act(() => {
        result.current.validate();
      });

      expect(result.current.isValidating).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(100);
        await Promise.resolve();
      });

      expect(result.current.isValidating).toBe(false);
    });
  });

  describe('Complex Validation Rules', () => {
    it('should handle complex validation logic', async () => {
      const rules = {
        password: (value: string) => {
          if (!value) return 'Password is required';
          if (value.length < 8) return 'Password must be at least 8 characters';
          if (!/[A-Z]/.test(value)) return 'Password must contain uppercase letter';
          if (!/[0-9]/.test(value)) return 'Password must contain number';
          return null;
        },
        confirmPassword: (value: string, allData: Record<string, unknown>) => {
          if (value !== allData.password) return 'Passwords do not match';
          return null;
        },
      };

      const { result } = renderHook(() =>
        useValidation({ password: 'weak', confirmPassword: 'different' }, rules)
      );

      await act(async () => {
        await result.current.validate();
      });

      expect(result.current.errors.password).toBe('Password must be at least 8 characters');
      expect(result.current.errors.confirmPassword).toBe('Passwords do not match');
    });

    it('should handle conditional validation', async () => {
      const rules = {
        type: (value: string) => (value ? null : 'Type is required'),
        details: (value: string, allData: Record<string, unknown>) => {
          if (allData.type === 'detailed' && !value) {
            return 'Details are required for detailed type';
          }
          return null;
        },
      };

      const { result } = renderHook(() => useValidation({ type: 'detailed', details: '' }, rules));

      await act(async () => {
        await result.current.validate();
      });

      expect(result.current.errors.details).toBe('Details are required for detailed type');

      // Change type to make details optional
      await act(async () => {
        await result.current.validateField('type', 'simple');
        await result.current.validate();
      });

      expect(result.current.errors.details).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle validation rules that throw errors', async () => {
      const rules = {
        field: () => {
          throw new Error('Validation rule error');
        },
      };

      const { result } = renderHook(() => useValidation({ field: 'test' }, rules));

      await act(async () => {
        await result.current.validate();
      });

      // Should handle the error gracefully
      expect(result.current.isValidating).toBe(false);
    });

    it('should handle null and undefined values', async () => {
      const rules = {
        nullable: (value: unknown) => (value ? 'Should be null' : null),
        undefinable: (value: unknown) => (value !== undefined ? 'Should be undefined' : null),
      };

      const { result } = renderHook(() =>
        useValidation({ nullable: null, undefinable: undefined }, rules)
      );

      await act(async () => {
        await result.current.validate();
      });

      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(true);
    });

    it('should handle empty rules object', async () => {
      const { result } = renderHook(() => useValidation({ field: 'value' }, {}));

      await act(async () => {
        await result.current.validate();
      });

      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should clean up async validations on unmount', async () => {
      const asyncRule = async (value: string) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return null;
      };

      const rules = {
        field: asyncRule,
      };

      const { result, unmount } = renderHook(() => useValidation({ field: 'test' }, rules));

      act(() => {
        result.current.validate();
      });

      expect(result.current.isValidating).toBe(true);

      unmount();

      // Should not throw errors after unmount
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(true).toBe(true); // Test passes if no errors are thrown
    });
  });
});
