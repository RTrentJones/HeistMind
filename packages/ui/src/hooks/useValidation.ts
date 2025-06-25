/**
 * useValidation hook
 * Provides form validation with real-time feedback
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { validateProps, Validator } from '../lib/runtime-validation';

export interface ValidationState<T> {
  /** Current values being validated */
  values: T;
  /** Validation errors by field */
  errors: Partial<Record<keyof T, string>>;
  /** Fields that have been touched */
  touched: Partial<Record<keyof T, boolean>>;
  /** Whether the form is currently valid */
  isValid: boolean;
  /** Whether validation is in progress */
  isValidating: boolean;
}

export interface UseValidationOptions<T> {
  /** Initial values */
  initialValues: T;
  /** Validation rules */
  validators: Partial<Record<keyof T, Validator>>;
  /** Whether to validate on change */
  validateOnChange?: boolean;
  /** Whether to validate on blur */
  validateOnBlur?: boolean;
  /** Debounce delay for validation */
  debounceMs?: number;
  /** Callback when validation completes */
  onValidationComplete?: (isValid: boolean, errors: Partial<Record<keyof T, string>>) => void;
}

// Type for simple validation functions
type SimpleValidator<T> = (value: T[keyof T], allValues?: T) => string | null | undefined;

/**
 * Hook for form validation with real-time feedback
 * Supports two signatures:
 * 1. useValidation({ initialValues, validators, ...options })
 * 2. useValidation(initialValues, validators)
 */
export function useValidation<T extends Record<string, unknown>>(
  options: UseValidationOptions<T>
): any;
export function useValidation<T extends Record<string, unknown>>(
  initialValues: T,
  validators?: Partial<Record<keyof T, SimpleValidator<T>>>
): any;
export function useValidation<T extends Record<string, unknown>>(
  optionsOrInitialValues: UseValidationOptions<T> | T,
  validators?: Partial<Record<keyof T, SimpleValidator<T>>>
) {
  // Handle both signatures
  const isOptionsObject = validators === undefined;
  const options = isOptionsObject
    ? (optionsOrInitialValues as UseValidationOptions<T>)
    : {
        initialValues: optionsOrInitialValues as T,
        validators: validators as any,
        validateOnChange: true,
        validateOnBlur: true,
        debounceMs: 300,
        onValidationComplete: undefined,
      };

  const {
    initialValues,
    validators: validatorRules,
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300,
    onValidationComplete,
  } = options;

  const [state, setState] = useState<ValidationState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isValid: true,
    isValidating: false,
  });

  const debounceTimeoutRef = useRef<number | undefined>(undefined);

  const validateField = useCallback(
    (field: keyof T, value: unknown): string | undefined => {
      const validator = validatorRules?.[field];
      if (!validator) return undefined;

      try {
        // Check if it's a simple function or a Validator object
        if (typeof validator === 'function') {
          // Simple validation function - pass value and all form values for complex validation
          const result = validator(value as T[keyof T], state.values);
          return result || undefined;
        } else if (validator && typeof validator === 'object' && 'validate' in validator) {
          // Validator object with validate method
          const result = (validator as Validator).validate(value, String(field));
          return result.isValid ? undefined : result.error;
        }
        return undefined;
      } catch (error) {
        // Structured error handling with context
        console.error('Validation error:', {
          field: String(field),
          value,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        if (error instanceof Error) {
          return `Validation failed for ${String(field)}: ${error.message}`;
        }

        return `Validation failed for ${String(field)}: Unknown error`;
      }
    },
    [validatorRules]
  );

  const validateAll = useCallback((): {
    isValid: boolean;
    errors: Partial<Record<keyof T, string>>;
  } => {
    const errors: Partial<Record<keyof T, string>> = {};

    if (validatorRules) {
      for (const field in validatorRules) {
        const error = validateField(field, state.values?.[field]);
        if (error) {
          (errors as any)[field] = error;
        }
      }
    }

    const isValid = Object.keys(errors).length === 0;

    onValidationComplete?.(isValid, errors);

    return { isValid, errors };
  }, [state.values, validatorRules, validateField, onValidationComplete]);

  const debouncedValidate = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = window.setTimeout(() => {
      const { isValid, errors } = validateAll();
      setState(prev => ({
        ...prev,
        errors,
        isValid,
        isValidating: false,
      }));
    }, debounceMs);
  }, [validateAll, debounceMs]);

  const setValue = useCallback(
    (field: keyof T, value: T[keyof T]) => {
      setState(prev => ({
        ...prev,
        values: {
          ...prev.values,
          [field]: value,
        },
        isValidating: validateOnChange,
      }));

      if (validateOnChange) {
        debouncedValidate();
      }
    },
    [validateOnChange, debouncedValidate]
  );

  const setValues = useCallback(
    (values: Partial<T>) => {
      setState(prev => ({
        ...prev,
        values: {
          ...prev.values,
          ...values,
        },
        isValidating: validateOnChange,
      }));

      if (validateOnChange) {
        debouncedValidate();
      }
    },
    [validateOnChange, debouncedValidate]
  );

  const touchField = useCallback(
    (field: keyof T) => {
      setState(prev => ({
        ...prev,
        touched: {
          ...prev.touched,
          [field]: true,
        },
      }));

      if (validateOnBlur) {
        const error = validateField(field, state.values[field]);
        setState(prev => ({
          ...prev,
          errors: {
            ...prev.errors,
            [field]: error,
          },
          isValid: error
            ? false
            : Object.keys({ ...prev.errors, [field]: error }).filter(k => prev.errors[k as keyof T])
                .length === 0,
        }));
      }
    },
    [validateOnBlur, validateField, state.values]
  );

  const reset = useCallback(() => {
    setState({
      values: initialValues,
      errors: {},
      touched: {},
      isValid: true,
      isValidating: false,
    });
  }, [initialValues]);

  const validate = useCallback(() => {
    setState(prev => ({ ...prev, isValidating: true }));
    const { isValid, errors } = validateAll();
    setState(prev => ({
      ...prev,
      errors,
      isValid,
      isValidating: false,
      touched: Object.keys(prev.values || {}).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {}
      ) as Partial<Record<keyof T, boolean>>,
    }));
    return isValid;
  }, [validateAll]);

  const getFieldProps = useCallback(
    (field: keyof T) => ({
      value: state.values[field],
      onChange: (value: T[keyof T]) => setValue(field, value),
      onBlur: () => touchField(field),
      error: state.touched[field] ? state.errors[field] : undefined,
      isInvalid: Boolean(state.touched[field] && state.errors[field]),
    }),
    [state.values, state.touched, state.errors, setValue, touchField]
  );

  // Additional functions expected by tests
  const validateFieldAsync = useCallback(
    async (field: keyof T, value?: unknown): Promise<string | undefined> => {
      setState(prev => ({ ...prev, isValidating: true }));

      const actualValue = value !== undefined ? value : state.values[field];
      const error = validateField(field, actualValue);

      setState(prev => {
        const newErrors = { ...prev.errors };
        if (error) {
          newErrors[field] = error;
        } else {
          delete newErrors[field];
        }

        const isValid = Object.keys(newErrors).length === 0;

        return {
          ...prev,
          errors: newErrors,
          isValid,
          isValidating: false,
          touched: { ...prev.touched, [field]: true },
        };
      });

      return error;
    },
    [validateField, state.values]
  );

  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {},
      isValid: true,
    }));
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: error },
      isValid: false,
    }));
  }, []);

  const clearFieldError = useCallback((field: keyof T) => {
    setState(prev => {
      const newErrors = { ...prev.errors };
      delete newErrors[field];
      const isValid = Object.keys(newErrors).length === 0;
      return {
        ...prev,
        errors: newErrors,
        isValid,
      };
    });
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    setValue,
    setValues,
    touchField,
    reset,
    validate,
    validateField: validateFieldAsync,
    clearErrors,
    setFieldError,
    clearFieldError,
    getFieldProps,
  };
}
