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

/**
 * Hook for form validation with real-time feedback
 */
export const useValidation = <T extends Record<string, unknown>>(
  options: UseValidationOptions<T>
) => {
  const {
    initialValues,
    validators,
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
      const validator = validators[field];
      if (!validator) return undefined;

      try {
        const result = validator.validate(value, String(field));
        return result.isValid ? undefined : result.error;
      } catch (error) {
        return error instanceof Error ? error.message : 'Validation error';
      }
    },
    [validators]
  );

  const validateAll = useCallback((): {
    isValid: boolean;
    errors: Partial<Record<keyof T, string>>;
  } => {
    const errors: Partial<Record<keyof T, string>> = {};

    for (const field in validators) {
      const error = validateField(field, state.values[field]);
      if (error) {
        errors[field] = error;
      }
    }

    const isValid = Object.keys(errors).length === 0;

    onValidationComplete?.(isValid, errors);

    return { isValid, errors };
  }, [state.values, validators, validateField, onValidationComplete]);

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
      touched: Object.keys(prev.values).reduce(
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
    getFieldProps,
  };
};
